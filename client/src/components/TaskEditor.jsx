import { useState } from "react";
import { PRIORITIES } from "../lib/constants.js";
import { toDateInput } from "../lib/dates.js";

/**
 * Modal editor for an existing task. Calls onSave(updates) with only the
 * editable fields, then the parent persists + closes.
 */
export default function TaskEditor({ task, onSave, onClose }) {
  const [form, setForm] = useState({
    title: task.title,
    notes: task.notes || "",
    type: task.type,
    priority: task.priority,
    dueDate: toDateInput(task.dueDate),
    reminderEnabled: task.reminderEnabled,
    reminderTime: task.reminderTime || "09:00",
  });
  const [busy, setBusy] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setBusy(true);
    try {
      await onSave({
        title: form.title.trim(),
        notes: form.notes,
        type: form.type,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        reminderEnabled: form.reminderEnabled,
        reminderTime: form.reminderEnabled ? form.reminderTime : null,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <div className="modal-head">
          <h2>Edit task</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="field">
          <label>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Optional details…"
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Type</label>
            <div className="seg">
              <button
                type="button"
                className={form.type === "oneoff" ? "seg-on" : ""}
                onClick={() => set("type", "oneoff")}
              >
                One-off
              </button>
              <button
                type="button"
                className={form.type === "daily" ? "seg-on" : ""}
                onClick={() => set("type", "daily")}
              >
                Daily
              </button>
            </div>
          </div>

          <div className="field">
            <label>Priority</label>
            <select
              className="pill-select"
              value={form.priority}
              onChange={(e) => set("priority", Number(e.target.value))}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.type === "oneoff" && (
          <div className="field">
            <label>Due date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label className="row-label">
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(e) => set("reminderEnabled", e.target.checked)}
            />
            Text me a reminder
          </label>
          {form.reminderEnabled && (
            <input
              type="time"
              value={form.reminderTime}
              onChange={(e) => set("reminderTime", e.target.value)}
            />
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
