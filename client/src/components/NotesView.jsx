import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api.js";
import NoteComposer from "./NoteComposer.jsx";
import NoteCard from "./NoteCard.jsx";
import NoteEditor from "./NoteEditor.jsx";

/**
 * The whole Notes board: composer, search, pinned/others sections, and an
 * Archive view. Self-contained — it loads and owns its own notes state so the
 * tasks side of the app stays untouched.
 */
export default function NotesView({ toast, query }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [editing, setEditing] = useState(null);
  const deleteTimers = useRef({});

  async function load() {
    setLoading(true);
    try {
      setNotes(await api.listNotes());
    } catch (err) {
      toast.error("Couldn't load your notes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { pinned, others, archivedCount } = useMemo(() => {
    const q = (query || "").trim().toLowerCase();
    const matches = (n) =>
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.body.toLowerCase().includes(q);

    const visible = notes.filter(
      (n) => n.archived === showArchive && matches(n)
    );
    return {
      pinned: visible.filter((n) => n.pinned),
      others: visible.filter((n) => !n.pinned),
      archivedCount: notes.filter((n) => n.archived).length,
    };
  }, [notes, query, showArchive]);

  async function createNote(data) {
    try {
      const created = await api.createNote(data);
      setNotes((n) => [created, ...n]);
    } catch (err) {
      toast.error("Couldn't add that note.");
    }
  }

  // Generic optimistic patch used by pin / color / archive / editor save.
  async function patch(note, updates, errMsg) {
    const prev = note;
    setNotes((list) =>
      list.map((n) => (n._id === note._id ? { ...n, ...updates } : n))
    );
    // Keep an open editor in sync so its star/tint reflect the change.
    setEditing((e) => (e && e._id === note._id ? { ...e, ...updates } : e));
    try {
      const saved = await api.updateNote(note._id, updates);
      setNotes((list) => list.map((n) => (n._id === note._id ? saved : n)));
      return saved;
    } catch (err) {
      toast.error(errMsg || "Couldn't save that note.");
      setNotes((list) => list.map((n) => (n._id === note._id ? prev : n)));
      setEditing((e) => (e && e._id === note._id ? prev : e));
    }
  }

  function togglePin(note) {
    patch(note, { pinned: !note.pinned, archived: false }, "Couldn't pin that note.");
  }

  function setColor(note, color) {
    patch(note, { color }, "Couldn't change the color.");
  }

  function toggleArchive(note) {
    const archived = !note.archived;
    patch(note, { archived, pinned: archived ? false : note.pinned });
    toast.success(archived ? "Archived." : "Unarchived.");
    if (editing && editing._id === note._id) setEditing(null);
  }

  function remove(note) {
    setNotes((list) => list.filter((n) => n._id !== note._id));
    if (editing && editing._id === note._id) setEditing(null);
    deleteTimers.current[note._id] = setTimeout(async () => {
      delete deleteTimers.current[note._id];
      try {
        await api.deleteNote(note._id);
      } catch (err) {
        toast.error("Couldn't delete that note.");
        setNotes((list) => [note, ...list]);
      }
    }, 5000);

    toast.show({
      message: "Note deleted",
      duration: 5000,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(deleteTimers.current[note._id]);
          delete deleteTimers.current[note._id];
          setNotes((list) => [note, ...list]);
        },
      },
    });
  }

  async function saveEdit(updates) {
    const saved = await patch(editing, updates, "Couldn't save changes.");
    setEditing(null);
    // If nothing meaningful is left, quietly drop the note (Keep behavior).
    const target = saved || editing;
    if (target && !target.title?.trim() && !target.body?.trim()) {
      remove(target);
    }
  }

  const cardHandlers = {
    onOpen: setEditing,
    onPin: togglePin,
    onColor: setColor,
    onArchive: toggleArchive,
    onDelete: remove,
  };

  function board(list) {
    return (
      <div className="note-grid">
        {list.map((n) => (
          <NoteCard key={n._id} note={n} {...cardHandlers} />
        ))}
      </div>
    );
  }

  const nothing = !pinned.length && !others.length;

  return (
    <>
      <div className="hero">
        <p className="hero-date">Notes</p>
        <h1>{showArchive ? "Archive" : "Your notes"}</h1>
        <p className="hero-sub">
          {showArchive
            ? archivedCount
              ? `${archivedCount} archived note${archivedCount === 1 ? "" : "s"}.`
              : "Nothing archived yet."
            : "Jot it down before it slips. Pin what matters."}
        </p>
      </div>

      {!showArchive && <NoteComposer onCreate={createNote} />}

      <div className="notes-bar">
        <button
          type="button"
          className={`text-toggle ${showArchive ? "text-toggle-on" : ""}`}
          onClick={() => setShowArchive((s) => !s)}
        >
          {showArchive ? "← Back to notes" : `Archive${archivedCount ? ` (${archivedCount})` : ""}`}
        </button>
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : nothing ? (
        <div className="empty">
          {query?.trim()
            ? "No notes match your search."
            : showArchive
            ? "Your archive is empty."
            : "No notes yet — jot one down above."}
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <section className="section">
              {others.length > 0 && (
                <div className="section-head">
                  <h2>Pinned</h2>
                </div>
              )}
              {board(pinned)}
            </section>
          )}

          {others.length > 0 && (
            <section className="section">
              {pinned.length > 0 && (
                <div className="section-head">
                  <h2>{showArchive ? "Archived" : "Others"}</h2>
                </div>
              )}
              {board(others)}
            </section>
          )}
        </>
      )}

      {editing && (
        <NoteEditor
          note={editing}
          onSave={saveEdit}
          onPin={togglePin}
          onArchive={toggleArchive}
          onDelete={remove}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
