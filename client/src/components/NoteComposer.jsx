import { useEffect, useRef, useState } from "react";
import ColorPicker from "./ColorPicker.jsx";

const empty = { title: "", body: "", color: "default", pinned: false };

/**
 * The "Take a note…" composer at the top of the board. Collapsed it's a single
 * line; focusing it expands to reveal the title, color picker, pin, and Add.
 */
export default function NoteComposer({ onCreate }) {
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const bodyRef = useRef(null);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function reset() {
    setForm(empty);
    setOpen(false);
  }

  async function submit() {
    const title = form.title.trim();
    const body = form.body.trim();
    if (!title && !body) {
      reset();
      return;
    }
    await onCreate({ title, body, color: form.color, pinned: form.pinned });
    reset();
  }

  // Clicking outside the open composer saves (just like Keep closes the card).
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) submit();
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form]);

  // Auto-grow the body textarea as you type.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [form.body, open]);

  return (
    <div
      ref={wrapRef}
      className={`note-composer ${open ? "note-composer-open" : ""}`}
      data-color={form.color}
    >
      {open && (
        <div className="note-composer-head">
          <input
            className="note-composer-title"
            placeholder="Title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
          <button
            type="button"
            className={`note-pin ${form.pinned ? "note-pin-on" : ""}`}
            onClick={() => set("pinned", !form.pinned)}
            aria-label={form.pinned ? "Unpin" : "Pin"}
            aria-pressed={form.pinned}
            title={form.pinned ? "Unpin" : "Pin"}
          >
            {form.pinned ? "★" : "☆"}
          </button>
        </div>
      )}

      {open ? (
        <textarea
          ref={bodyRef}
          className="note-composer-body"
          placeholder="Take a note…"
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          autoFocus
          rows={1}
        />
      ) : (
        <button
          type="button"
          className="note-composer-collapsed"
          onClick={() => setOpen(true)}
        >
          Take a note…
        </button>
      )}

      {open && (
        <div className="note-composer-foot">
          <ColorPicker value={form.color} onChange={(c) => set("color", c)} />
          <button type="button" className="btn btn-sm" onClick={submit}>
            Add
          </button>
        </div>
      )}
    </div>
  );
}
