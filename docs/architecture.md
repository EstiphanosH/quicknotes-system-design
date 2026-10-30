docs/architecture.md
--------------------

QuickNotes Architecture
=======================

Requirements
------------

**Functional**

*   Users can sign up, sign in, and manage their own notes (CRUD).
    
*   Notes can carry tags; tags are user-scoped.
    
*   The list view returns the user's latest notes with pagination.
    
*   All endpoints are authenticated and scoped per user.
    

**Non-functional**

*   p95 read latency < 200 ms at the edge, p99 < 500 ms.
    
*   99.9% monthly availability.
    
*   Read-heavy traffic pattern (notes are read far more than written).
    
*   Durable storage with daily backups and point-in-time recovery.
    
*   Horizontally scalable app tier; no single point of failure.
    

Load estimate (1,000,000 users)
-------------------------------

Assumptions: 20% DAU = 200,000 active users/day. Each active user performs ~40 note reads and ~3 writes per day.

*   Reads/sec = (200,000 × 40) / 86,400 ≈ **93 reads/sec average**; design peak 10× → **~930 RPS**.
    
*   Writes/sec = (200,000 × 3) / 86,400 ≈ **7 writes/sec average**; peak ~**70 WPS**.
    
*   Storage/year ≈ 200,000 users × 3 notes/day × 365 days × 2 KB ≈ **438 GB/year**; round to **~0.5 TB/year** (with tags and indexes, plan for **1 TB/year**).
    

Cache absorbs the read-heavy tail so the primary sees only writes and cache misses.

Architecture diagram
--------------------

text

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML                          `┌─────────────┐                            │   Client    │                            │ (Browser)   │                            └──────┬──────┘                                   │ HTTPS                            ┌──────▼──────┐                            │     DNS     │                            └──────┬──────┘                                   │                            ┌──────▼──────┐                            │     CDN     │  (static assets, TLS offload)                            └──────┬──────┘                                   │                            ┌──────▼───────────┐                            │  Load Balancer   │  (health checks, TLS)                            └───┬──────────┬───┘                                │          │                       ┌────────▼──┐  ┌────▼────────┐                       │ App srv 1 │  │  App srv 2  │  … (N app servers)                       └────┬──────┘  └──────┬──────┘                            │                │               ┌────────────┴───────┬────────┴────────────┐               │                    │                     │        ┌──────▼──────┐      ┌──────▼──────┐      ┌───────▼────────┐        │    Cache    │      │  Primary DB │      │     Queue      │        │  (Redis)    │      │ (Postgres)  │      │  (SQS/Rabbit)  │        └─────────────┘      └──────┬──────┘      └───────┬────────┘                                    │                     │                             ┌──────▼──────┐       ┌──────▼──────┐                             │Read replica │       │   Worker    │                             │ (Postgres)  │       │ (async jobs)│                             └─────────────┘       └─────────────┘`

**Required-component checklist**

ComponentPresentProblem it solvesClient✅Renders UI, issues HTTP requestsDNS✅Resolves api.quicknotes.example to the nearest edgeCDN✅Caches static assets and terminates TLS close to usersLoad balancer✅Distributes traffic, health-checks app servers, drains bad nodesApp servers (≥2)✅ ×2 shown, scales to NRuns stateless business logic; horizontal scaleCache (Redis)✅Absorbs read-hot note lists, cuts DB loadPrimary database✅Single writer of truth for notes/users/tagsRead replica✅Serves list reads, offloads the primaryQueue✅Decouples slow side-work (indexing, emails) from requestsWorker✅Consumes queue jobs asynchronously

Request flows
-------------

**GET /notes**

1.  Client resolves api.quicknotes.example via DNS and connects (TLS terminated at CDN or LB).
    
2.  Load balancer picks a healthy app server.
    
3.  App server authenticates the Bearer token, derives user\_id.
    
4.  App checks Redis for notes:{user\_id}:page=1; on hit, returns the cached payload.
    
5.  On miss, app queries the **read replica**: SELECT … WHERE user\_id = ? ORDER BY created\_at DESC LIMIT 20.
    
6.  App writes the result to Redis with a short TTL (30 s) and returns 200 with the paginated body.
    

**POST /notes**

1.  Same DNS → LB → app-server path.
    
2.  App authenticates, validates the body (title required, ≤ 100 chars).
    
3.  App writes the note to the **primary database** inside a transaction and commits.
    
4.  App invalidates notes:{user\_id}:\* cache keys.
    
5.  App enqueues a note.created job (search indexing, notification).
    
6.  App responds **201 Created** with the new note; the worker processes the job in the background.
    

Trade-offs
----------

1.  **Cache-aside vs write-through.** We use cache-aside (populate on miss, invalidate on write). It's simpler and resilient to cache outages, but the very first read after a write is a miss. Write-through would keep cache always warm at the cost of write complexity and coupling.
    
2.  **Read replica lag vs single-node reads.** Offloading list queries to a replica scales reads, but a note created milliseconds ago may not appear until replication catches up. For a note-taking app this lag is acceptable; a "read-your-writes" token could be added if it becomes a complaint.
    
3.  **Queue decoupling vs immediacy.** Moving indexing/notifications to a worker keeps p99 API latency low, at the cost of eventual consistency for secondary effects (a note may take seconds to appear in search).
    

Single points of failure
------------------------

*   **App tier:** multiple stateless servers behind the LB; losing one just shifts traffic.
    
*   **LB:** deployed as a managed, multi-AZ load balancer (or dual LBs with DNS failover).
    
*   **Cache:** Redis in cluster mode with automatic failover; a total cache outage degrades to DB reads rather than taking the site down.
    
*   **Primary DB:** synchronous standby with automated failover (managed Postgres multi-AZ). The read replica is a separate node, so a replica failure never blocks writes.
    
*   **Queue / worker:** managed queue with at-least-once delivery and ≥2 workers; a dead worker just delays jobs, not requests.
    
*   **DNS / CDN:** provided by managed services with anycast and multiple edge locations.