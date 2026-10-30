QuickNotes
==========

QuickNotes is a note-taking service being rebuilt from a browser-only prototype into a real online product. This repository contains the **practice API client** (talking to JSONPlaceholder) plus the **design documents** the backend team will build from.

How to run the API client
-------------------------

1.  Clone the repo and cd into it.
    
2.  bashpython3 -m http.server 8080# or: npx serve .
    
3.  Open http://localhost:8080/.
    
4.  Click **Load notes** to fetch 10 notes from https://jsonplaceholder.typicode.com/posts?\_limit=10.
    
5.  Use the form to **create** a note and the per-note **Delete** button to remove one.
    

> JSONPlaceholder does not persist writes — created notes are echoed back with a synthetic id and deletes always return 200. The client treats its local list as the source of truth for the UI. This behaviour is documented in a comment at the top of api.js.

Design documents
----------------

*   [API design](https://docs/api-design.md)
    
*   [Data model](https://docs/data-model.md)
    
*   [Architecture](https://docs/architecture.md)
    

What I learned
--------------

1.  **One reusable request() pays for itself.** Centralising fetch, response.ok checks, JSON parsing, and error wrapping removed ~40 lines of duplication and made every request handler a three-line try/catch/finally.
    
2.  **State machines beat ad-hoc flags.** Driving every control through a single setBusy() and every message through setStatus() guaranteed no button could be left disabled after an error — the finally block is what makes that a structural guarantee instead of a hope.
    
3.  **textContent is not optional.** Building DOM nodes with createElement + textContent (instead of innerHTML templates) eliminates the entire XSS class of bugs and is only marginally more verbose.
    
4.  **Practice APIs lie about persistence.** JSONPlaceholder's POST/DELETE responses are successful but do not mutate server state; designing the client around a local list and reconciling on success kept the UX honest.
    
5.  **Design docs are executable specifications.** Writing the API table, data model, and request-flow diagrams first exposed three ambiguities (pagination, cache invalidation, read-your-writes) before any code was written.