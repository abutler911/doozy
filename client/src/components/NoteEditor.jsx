import { useEffect, useRef, useState } from "react";
import ColorPicker from "./ColorPicker.jsx";

/**
 * Full-screen-ish modal for editing a note. Saves title/body/color on close
 * (Keep-style: there's no explicit Save — Done persists). Pin, archive, and
 * delete live in the editor too.
 */
export default function NoteEditor({ note, onSave, onPin, onArchive, onDelete, onClose }) {
  const [form, setForm] = useState({
    title: note.title || "",
    body: note.body || "",
    color: note.color || "default",
  });
  const bodyRef = useRef(null);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function done() {
    onSave({
      title: form.title.trim(),
      body: form.body,
      color: form.color,
    });
  }

  // Auto-grow the body textarea to fit its content.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [form.body]);

  return (
    <div className="modal-backdrop" onClick={done}>
      <div
        className="modal note-modal"
        data-color={form.color}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="note-modal-top">
          <input
            className="note-composer-title"
            placeholder="Title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <button
            type="button"
            className={`note-pin ${note.pinned ? "note-pin-on" : ""}`}
            onClick={() => onPin(note)}
            aria-label={note.pinned ? "Unpin" : "Pin"}
            aria-pressed={note.pinned}
            title={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned ? "★" : "☆"}
          </button>
        </div>

        <textarea
          ref={bodyRef}
          className="note-composer-body note-modal-body"
          placeholder="Take a note…"
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          autoFocus
        />

        <div className="note-modal-foot">
          <ColorPicker value={form.color} onChange={(c) => set("color", c)} />
          <div className="note-modal-tools">
            <button
              type="button"
              className="note-act"
              onClick={() => onArchive(note)}
              aria-label={note.archived ? "Unarchive" : "Archive"}
              title={note.archived ? "Unarchive" : "Archive"}
            >
              {note.archived ? "⬆" : "▾"}
            </button>
            <button
              type="button"
              className="note-act note-act-danger"
              onClick={() => onDelete(note)}
              aria-label="Delete"
              title="Delete"
            >
              🗑
            </button>
            <button type="button" className="btn btn-sm" onClick={done}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
