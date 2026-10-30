docs/api-design.md
------------------

QuickNotes REST API — Design
============================

Base URL: https://api.quicknotes.example/v1All requests and responses are application/json. Authentication is a Bearer token in the Authorization header.

Endpoints
---------

MethodPathDescriptionSuccess statusGET/notesList the authenticated user's notes (paginated via ?limit=&offset=)200GET/notes/{id}Retrieve a single note200POST/notesCreate a note201PATCH/notes/{id}Partially update a note (title and/or body)200DELETE/notes/{id}Delete a note204GET/tagsList tags available to the user200POST/notes/{id}/tagsAttach a tag to a note201DELETE/notes/{id}/tags/{tagId}Remove a tag from a note204

Request and response examples
-----------------------------

### Create a note — POST /notes

**Request**

http

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   POST /v1/notes HTTP/1.1  Authorization: Bearer   Content-Type: application/json  {    "title": "Groceries",    "body": "Milk, eggs, bread"  }   `

**Response — 201 Created**

json

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    "id": 101,    "userId": 1,    "title": "Groceries",    "body": "Milk, eggs, bread",    "createdAt": "2024-05-20T10:15:00Z",    "updatedAt": "2024-05-20T10:15:00Z"  }   `

### List notes — GET /notes

**Request**

http

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`GET /v1/notes?limit=2 HTTP/1.1  Authorization: Bearer` 

**Response — 200 OK**

json

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    "data": [      { "id": 101, "userId": 1, "title": "Groceries", "body": "Milk, eggs, bread",        "createdAt": "2024-05-20T10:15:00Z", "updatedAt": "2024-05-20T10:15:00Z" },      { "id": 100, "userId": 1, "title": "Standup", "body": "10:00 every weekday",        "createdAt": "2024-05-19T09:00:00Z", "updatedAt": "2024-05-19T09:00:00Z" }    ],    "meta": { "limit": 2, "offset": 0, "total": 42 }  }   `

Error responses
---------------

StatusMeaning400Bad Request — validation failed401Unauthorized — missing or invalid token403Forbidden — authenticated but not allowed to touch this resource404Not Found — resource doesn't exist or isn't visible to this user500Internal Server Error — unexpected failure

**Example error body (400)**

json

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   {    "error": {      "code": "VALIDATION_ERROR",      "message": "Title is required and must be 100 characters or fewer.",      "details": [{ "field": "title", "issue": "required" }]    }  }   `

**Example error body (404)**

json

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   { "error": { "code": "NOT_FOUND", "message": "Note 999 not found." } }   `

**Conventions**

*   204 responses carry no body.
    
*   Idempotency: PUT is not used; PATCH is safe to retry only if If-Match is supplied.
    
*   Pagination: limit (default 20, max 100) and offset (default 0)