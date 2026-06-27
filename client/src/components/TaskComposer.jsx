import { useMemo, useState } from "react";
import { PRIORITIES } from "../lib/constants.js";
import { parseQuickAdd } from "../lib/parse.js";
import WeekdayPicker from "./WeekdayPicker.jsx";

const empty = {
  title: "",
  type: "oneoff",
  priority: 2,
  dueDate: "",
  repeatDays: [],
  reminderEnabled: false,
  reminderTime: "09:00",
};

export default function TaskComposer({ onCreate }) {
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);

  // Live natural-language parse of whatever's typed so far.
  const parsed = useMemo(() => parseQuickAdd(form.title), [form.title]);
  const showPreview = form.title.trim() && parsed.tokens.length > 0;

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    // Natural-language tokens win over the manual controls for anything they
    // detect; the controls fill in whatever wasn't typed.
    const f = parsed.fields;
    const title = (parsed.title || form.title).trim();
    if (!title) return;

    const type = f.type || form.type;
    const priority = f.priority || form.priority;
    const repeatDays = type === "daily" ? f.repeatDays ?? form.repeatDays : [];
    const dueRaw = type === "daily" ? "" : f.dueDate || form.dueDate;
    const reminderEnabled = f.reminderEnabled || form.reminderEnabled;
    const reminderTime = reminderEnabled ? f.reminderTime || form.reminderTime : null;

    await onCreate({
      title,
      type,
      priority,
      repeatDays,
      dueDate: dueRaw ? new Date(dueRaw).toISOString() : null,
      reminderEnabled,
      reminderTime,
    });
    setForm(empty);
    setOpen(false);
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-row">
        <input
          className="composer-input"
          placeholder="What needs doing?  try “pay rent fri 9am !urgent”"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <button className="btn btn-primary" type="submit">
          Add
        </button>
      </div>

      {showPreview && (
        <div className="parse-preview" aria-live="polite">
          <span className="parse-title">{parsed.title || "…"}</span>
          <span className="parse-chips">
            {parsed.tokens.map((t, i) => (
              <span key={i} className={`parse-chip parse-${t.type}`}>
                {t.label}
              </span>
            ))}
          </span>
        </div>
      )}

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
        </div>
      )}
    </form>
  );
}
