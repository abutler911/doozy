import { useState } from "react";
import ColorPicker from "./ColorPicker.jsx";

/** Relative-ish timestamp for the card foot, e.g. "Edited Jun 12". */
function editedLabel(note) {
  const d = new Date(note.updatedAt || note.createdAt);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  return `Edited ${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })}`;
}

/**
 * A single Keep-style note tile. The whole body opens the editor; hover (or
 * tap, on touch) reveals the action bar: color, archive/unarchive, delete.
 */
export default function NoteCard({ note, onOpen, onPin, onColor, onArchive, onDelete }) {
  const [palette, setPalette] = useState(false);

  return (
    <article className="note" data-color={note.color}>
      <button
        type="button"
        className="note-pin note-pin-corner"
        onClick={() => onPin(note)}
        aria-label={note.pinned ? "Unpin note" : "Pin note"}
        aria-pressed={note.pinned}
        title={note.pinned ? "Unpin" : "Pin"}
      >
        {note.pinned ? "★" : "☆"}
      </button>

      <button type="button" className="note-open" onClick={() => onOpen(note)}>
        {note.title && <h3 className="note-title">{note.title}</h3>}
        {note.body && <p className="note-body">{note.body}</p>}
        {!note.title && !note.body && <p className="note-empty">Empty note</p>}
      </button>

      <div className="note-foot">
        <span className="note-edited">{editedLabel(note)}</span>
        <div className="note-actions">
          <div className="note-palette-wrap">
            <button
              type="button"
              className="note-act"
              onClick={() => setPalette((p) => !p)}
              aria-label="Change color"
              aria-expanded={palette}
              title="Color"
            >
              ◑
            </button>
            {palette && (
              <div className="note-palette" onMouseLeave={() => setPalette(false)}>
                <ColorPicker
                  value={note.color}
                  onChange={(c) => {
                    onColor(note, c);
                    setPalette(false);
                  }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            className="note-act"
            onClick={() => onArchive(note)}
            aria-label={note.archived ? "Unarchive note" : "Archive note"}
            title={note.archived ? "Unarchive" : "Archive"}
          >
            {note.archived ? "⬆" : "▾"}
          </button>
          <button
            type="button"
            className="note-act note-act-danger"
            onClick={() => onDelete(note)}
            aria-label="Delete note"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </div>
    </article>
  );
}
