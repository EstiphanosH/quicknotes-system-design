"use strict";

/**
 * QuickNotes API client (practice layer).
 *
 * Targets the JSONPlaceholder public API. Important caveat:
 * JSONPlaceholder does NOT persist resources. POST returns a synthetic
 * object (id 101 in practice) and DELETE returns {} — the server state
 * never changes. We therefore treat the local list as the source of
 * truth for the UI and reconcile it after each successful request.
 *
 * @see https://jsonplaceholder.typicode.com/
 */

const API_URL = "https://jsonplaceholder.typicode.com/posts";

const MAX_TITLE_LENGTH = 100;

/** @typedef {{ id: number, title: string, body: string, userId: number }} Note */

// --- DOM references -----------------------------------------------------
const loadBtn = /** @type {HTMLButtonElement} */ (document.getElementById("load-btn"));
const submitBtn = /** @type {HTMLButtonElement} */ (document.getElementById("submit-btn"));
const statusEl = /** @type {HTMLElement} */ (document.getElementById("status"));
const notesList = /** @type {HTMLUListElement} */ (document.getElementById("notes-list"));
const form = /** @type {HTMLFormElement} */ (document.getElementById("note-form"));
const titleInput = /** @type {HTMLInputElement} */ (document.getElementById("title-input"));
const bodyInput = /** @type {HTMLTextAreaElement} */ (document.getElementById("body-input"));

// --- Status / UI helpers ------------------------------------------------
/**
 * Render a status message with a state class used by style.css.
 * @param {string} message
 * @param {"loading"|"success"|"error"|"info"} [state]
 */
function setStatus(message, state = "info") {
  statusEl.textContent = message;
  statusEl.className = `status status--${state}`;
}

/**
 * Toggle every interactive control. Called from every request's
 * try/finally so the UI can never remain stuck in a disabled state.
 * @param {boolean} busy
 */
function setBusy(busy) {
  loadBtn.disabled = busy;
  submitBtn.disabled = busy;
  for (const btn of notesList.querySelectorAll("button.delete-btn")) {
    btn.disabled = busy;
  }
}

/**
 * Build a single <li> for a note. All user-supplied text is inserted
 * via textContent — never innerHTML — to prevent XSS.
 * @param {Note} note
 * @returns {HTMLLIElement}
 */
function renderNote(note) {
  const li = document.createElement("li");
  li.dataset.id = String(note.id);
  li.className = "note";

  const title = document.createElement("h3");
  title.className = "note__title";
  title.textContent = note.title;

  const body = document.createElement("p");
  body.className = "note__body";
  body.textContent = note.body;

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "delete-btn";
  remove.textContent = "Delete";
  remove.addEventListener("click", () => onDelete(note.id));

  li.append(title, body, remove);
  return li;
}

/**
 * Replace the list contents with a fresh array of notes.
 * @param {Note[]} notes
 */
function renderNotes(notes) {
  notesList.replaceChildren();

  if (notes.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No notes yet — create one to get started.";
    notesList.append(empty);
    return;
  }

  for (const note of notes) {
    notesList.append(renderNote(note));
  }
}

// --- Reusable request() -------------------------------------------------
/**
 * Thin wrapper around fetch that:
 *  - checks response.ok and throws a rich error,
 *  - parses JSON only when a body is present,
 *  - attaches the status code to the thrown error for the UI.
 *
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<unknown>}
 */
async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    /** @type {Error & { status?: number }} */
    const err = new Error(`Request failed with status ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

// --- API operations -----------------------------------------------------
/** GET the first 10 notes. @returns {Promise<Note[]>} */
async function loadNotes() {
  return /** @type {Note[]} */ (await request(`${API_URL}?_limit=10`));
}

/**
 * POST a new note. JSONPlaceholder echoes back the payload with a
 * synthetic id (101). We do not rely on that id for anything other
 * than the success message.
 * @param {{ title: string, body: string }} payload
 * @returns {Promise<Note>}
 */
async function createNote(payload) {
  return /** @type {Note} */ (
    await request(API_URL, {
      method: "POST",
      body: JSON.stringify({ ...payload, userId: 1 }),
    })
  );
}

/** DELETE a note by id. @param {number} id */
async function deleteNote(id) {
  await request(`${API_URL}/${id}`, { method: "DELETE" });
}

// --- Validation ---------------------------------------------------------
/**
 * @param {string} rawTitle
 * @returns {string | null} an error message, or null when valid
 */
function validateTitle(rawTitle) {
  const title = rawTitle.trim();
  if (title.length === 0) return "Title is required.";
  if (title.length > MAX_TITLE_LENGTH) {
    return `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  }
  return null;
}

// --- Event handlers -----------------------------------------------------
async function onLoad() {
  setBusy(true);
  setStatus("Loading notes…", "loading");
  try {
    const notes = await loadNotes();
    renderNotes(notes);
    setStatus(`Loaded ${notes.length} notes from the server.`, "success");
  } catch (error) {
    console.error(error);
    setStatus(
      "Couldn't load notes. Check your connection and try again.",
      "error",
    );
  } finally {
    setBusy(false);
  }
}

async function onSubmit(event) {
  event.preventDefault();

  const title = titleInput.value;
  const body = bodyInput.value;

  const validationError = validateTitle(title);
  if (validationError) {
    setStatus(validationError, "error");
    titleInput.focus();
    return;
  }

  setBusy(true);
  setStatus("Creating note…", "loading");

  try {
    const created = await createNote({ title: title.trim(), body: body.trim() });

    // Prepend the returned note. We keep the synthetic id only for
    // display; it will 404 on DELETE against JSONPlaceholder, which is
    // handled in onDelete below.
    const firstChild = notesList.firstElementChild;
    if (firstChild && firstChild.classList.contains("empty")) {
      notesList.replaceChildren();
    }
    notesList.prepend(renderNote(created));

    setStatus(
      `Note created (status 201, id ${created.id}).`,
      "success",
    );
    form.reset();
    titleInput.focus();
  } catch (error) {
    console.error(error);
    setStatus("Couldn't create the note. Please try again.", "error");
  } finally {
    setBusy(false);
  }
}

/**
 * Delete handler. JSONPlaceholder always returns 200 for DELETE, even
 * for ids it never actually stored, so we optimistically remove the
 * row from the DOM on success. If the real API later 404s, the catch
 * branch surfaces it.
 * @param {number} id
 */
async function onDelete(id) {
  setBusy(true);
  setStatus(`Deleting note ${id}…`, "loading");
  try {
    await deleteNote(id);
    const li = notesList.querySelector(`li[data-id="${id}"]`);
    if (li) li.remove();

    if (notesList.children.length === 0) {
      renderNotes([]);
    }
    setStatus(`Note ${id} deleted (status 200).`, "success");
  } catch (error) {
    console.error(error);
    setStatus(
      `Couldn't delete note ${id}. It may no longer exist on the server.`,
      "error",
    );
  } finally {
    setBusy(false);
  }
}

// --- Wire up ------------------------------------------------------------
loadBtn.addEventListener("click", onLoad);
form.addEventListener("submit", onSubmit);

// First paint: explicit empty state.
renderNotes([]);