import { useState } from "react";
import { PRIORITIES } from "../lib/constants.js";
import WeekdayPicker from "./WeekdayPicker.jsx";

const empty = {
  title: "",
  type: "oneoff",
  priority: 2,
  dueDate: "",
  repeatDays: [],
  reminderEnabled: false,
  reminderTime: "09:00",
  subtasks: [],
};

export default function TaskComposer({ onCreate }) {
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addSubtask() {
    const title = newSubtask.trim();
    if (!title) return;
    set("subtasks", [...form.subtasks, { title, completed: false }]);
    setNewSubtask("");
  }

  function removeSubtask(i) {
    set(
      "subtasks",
      form.subtasks.filter((_, idx) => idx !== i)
    );
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onCreate({
      ...form,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      reminderTime: form.reminderEnabled ? form.reminderTime : null,
      subtasks: form.subtasks
        .map((s) => ({ title: s.title.trim(), completed: false }))
        .filter((s) => s.title),
    });
    setForm(empty);
    setNewSubtask("");
    setOpen(false);
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-row">
        <input
          className="composer-input"
          placeholder="What needs doing?"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <button className="btn btn-primary" type="submit">
          Add
        </button>
      </div>

      {open && (
        <div className="composer-options">
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

          {form.type === "oneoff" && (
            <input
              type="date"
              className="time-input"
              value={form.dueDate}
              onChange={(e) => set("dueDate", e.target.value)}
              aria-label="Due date"
            />
          )}

          {form.type === "daily" && (
            <WeekdayPicker
              value={form.repeatDays}
              onChange={(v) => set("repeatDays", v)}
            />
          )}

          <label className="reminder-toggle">
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(e) => set("reminderEnabled", e.target.checked)}
            />
            Remind me
          </label>
          {form.reminderEnabled && (
            <input
              type="time"
              className="time-input"
              value={form.reminderTime}
              onChange={(e) => set("reminderTime", e.target.value)}
            />
          )}

          <div className="composer-checklist">
            <label className="composer-checklist-label">Checklist</label>
            {form.subtasks.length > 0 && (
              <ul className="subtask-edit-list">
                {form.subtasks.map((sub, i) => (
                  <li key={i} className="subtask-edit-row">
                    <span className="subtask-title">{sub.title}</span>
                    <button
                      type="button"
                      className="icon-btn delete"
                      onClick={() => removeSubtask(i)}
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="subtask-add-row">
              <input
                type="text"
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSubtask();
                  }
                }}
                placeholder="Add a checklist item…"
                aria-label="New checklist item"
              />
              <button type="button" className="btn btn-sm" onClick={addSubtask}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
