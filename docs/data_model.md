docs/data-model.md
------------------

QuickNotes Data Model
=====================

Entities
--------

### users

ColumnTypeNotesidBIGINT**PK**, autoincrementemailVARCHAR(255)UNIQUE, NOT NULLpassword\_hashVARCHAR(255)NOT NULLcreated\_atTIMESTAMPTZNOT NULL, default now()

### notes

ColumnTypeNotesidBIGINT**PK**, autoincrementuser\_idBIGINT**FK → users.id**, ON DELETE CASCADEtitleVARCHAR(100)NOT NULLbodyTEXTcreated\_atTIMESTAMPTZNOT NULL, default now()updated\_atTIMESTAMPTZNOT NULL, default now()

### tags

ColumnTypeNotesidBIGINT**PK**, autoincrementuser\_idBIGINT**FK → users.id**, ON DELETE CASCADEnameVARCHAR(50)NOT NULL; UNIQUE(user\_id, name)

### note\_tags

ColumnTypeNotesnote\_idBIGINT**PK (composite)**; **FK → notes.id** ON DELETE CASCADEtag\_idBIGINT**PK (composite)**; **FK → tags.id** ON DELETE CASCADE

Relationships
-------------

*   **users → notes (one-to-many)**: a user owns many notes; each note belongs to exactly one user.
    
*   **users → tags (one-to-many)**: tags are scoped per user.
    
*   **notes ↔ tags (many-to-many)**: implemented by the note\_tags join table. A note can carry many tags; a tag can appear on many notes. The composite PK prevents duplicate associations, and ON DELETE CASCADE keeps the join table consistent.
    

CREATE TABLE statements
-----------------------

sql

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   CREATE TABLE users (    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,    email         VARCHAR(255) NOT NULL UNIQUE,    password_hash VARCHAR(255) NOT NULL,    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()  );  CREATE TABLE notes (    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,    user_id    BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,    title      VARCHAR(100) NOT NULL,    body       TEXT,    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),    updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()  );  CREATE TABLE tags (    id      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,    user_id BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,    name    VARCHAR(50) NOT NULL,    UNIQUE (user_id, name)  );  CREATE TABLE note_tags (    note_id BIGINT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,    tag_id  BIGINT NOT NULL REFERENCES tags(id)  ON DELETE CASCADE,    PRIMARY KEY (note_id, tag_id)  );   `

Example queries
---------------

**1\. All notes for a user (most recent first)**

sql

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   SELECT id, title, body, created_at  FROM notes  WHERE user_id = $1  ORDER BY created_at DESC  LIMIT 20 OFFSET 0;   `

**2\. A note with its tags (JOIN)**

sql

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   SELECT n.id, n.title, n.body, t.name AS tag  FROM notes n  LEFT JOIN note_tags nt ON nt.note_id = n.id  LEFT JOIN tags t       ON t.id = nt.tag_id  WHERE n.id = $1  ORDER BY t.name;   `

**3\. Count notes per tag for a user**

sql

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   SELECT t.name, COUNT(nt.note_id) AS note_count  FROM tags t  LEFT JOIN note_tags nt ON nt.tag_id = t.id  WHERE t.user_id = $1  GROUP BY t.id, t.name  ORDER BY note_count DESC;   `

Index
-----

sql

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   CREATE INDEX idx_notes_user_created    ON notes (user_id, created_at DESC);   `

**Reason:** the dominant read pattern is "list the most recent notes for a user" (WHERE user\_id = ? ORDER BY created\_at DESC LIMIT 20). Without a composite index, PostgreSQL performs a full table scan plus sort; with it, the query becomes an index range scan and the sort is free. This keeps p99 list latency low as the notes table grows into the tens of millions of rows.

SQL vs NoSQL decision
---------------------

QuickNotes uses a **relational (PostgreSQL) database**. The schema has strong integrity constraints (users own notes; notes ↔ tags is a classic many-to-many) and the reporting queries are joins and aggregations — exactly what SQL is built for. Transactions let us create a note and attach tags atomically. The main argument for NoSQL (schema-free, horizontally shardable documents) does not apply: the schema is stable, note payloads are small, and 1M users' data fits comfortably on a primary + replica with a partition plan. If we needed per-note full-text search at very large scale, we would add a dedicated search index rather than abandon relational integrity.