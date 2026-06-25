import { useState } from "react";
import { PRIORITIES } from "../lib/constants.js";

const empty = {
  title: "",
  type: "oneoff",
  priority: 2,
  dueDate: "",
  reminderEnabled: false,
  reminderTime: "09:00",
};

export default function TaskComposer({ onCreate }) {
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    await onCreate({
      ...form,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      reminderTime: form.reminderEnabled ? form.reminderTime : null,
    });
    setForm(empty);
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
        </div>
      )}
    </form>
  );
}
