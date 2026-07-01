import { useMemo, useState } from "react";
import { PRIORITIES } from "../lib/constants.js";
import { parseQuickAdd, stripQuickAdd } from "../lib/quickadd.js";
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

const CHIP_ICON = { due: "📅", time: "🔔", priority: "⚑", repeat: "↻" };

export default function TaskComposer({ onCreate, inputRef }) {
  const [form, setForm] = useState(empty);
  const [open, setOpen] = useState(false);
  const [newSubtask, setNewSubtask] = useState("");
  // Quick-add matches the user dismissed (chip ✕) — keep their text literal.
  const [ignored, setIgnored] = useState(() => new Set());
  // Fields the user set by hand — manual choices beat parsed tokens.
  const [touched, setTouched] = useState(() => new Set());

  const parsed = useMemo(() => parseQuickAdd(form.title), [form.title]);
  const active = parsed.matches.filter(
    (m) => !ignored.has(m.key) && !touched.has(m.key)
  );
  const byKey = Object.fromEntries(active.map((m) => [m.key, m]));

  // What will actually be created: the form, overlaid with live parse results.
  const eff = {
    ...form,
    priority: byKey.priority ? byKey.priority.value : form.priority,
    dueDate: byKey.due ? byKey.due.value : form.dueDate,
    reminderEnabled: byKey.time ? true : form.reminderEnabled,
    reminderTime: byKey.time ? byKey.time.value : form.reminderTime,
    type: byKey.repeat ? "daily" : form.type,
    repeatDays: byKey.repeat ? byKey.repeat.value : form.repeatDays,
  };

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Manual edits win over parsed tokens from then on (until the next task).
  function setManual(key, value, matchKey) {
    set(key, value);
    setTouched((t) => new Set(t).add(matchKey));
  }

  function setTitle(value) {
    set("title", value);
    if (!value.trim() && (ignored.size || touched.size)) {
      setIgnored(new Set());
      setTouched(new Set());
    }
  }

  function dismissChip(key) {
    setIgnored((s) => new Set(s).add(key));
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
    // Strip applied tokens from the title; if that leaves nothing, keep the raw text.
    const title = stripQuickAdd(form.title, active) || form.title.trim();
    await onCreate({
      ...eff,
      title,
      dueDate:
        eff.type === "oneoff" && eff.dueDate
          ? new Date(eff.dueDate).toISOString()
          : null,
      repeatDays: eff.type === "daily" ? eff.repeatDays : [],
      reminderTime: eff.reminderEnabled ? eff.reminderTime : null,
      subtasks: form.subtasks
        .map((s) => ({ title: s.title.trim(), completed: false }))
        .filter((s) => s.title),
    });
    setForm(empty);
    setNewSubtask("");
    setIgnored(new Set());
    setTouched(new Set());
    setOpen(false);
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-row">
        <input
          ref={inputRef}
          className="composer-input"
          placeholder={'What needs doing? Try "gym tomorrow at 6pm !high"'}
          value={form.title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <button className="btn btn-primary" type="submit">
          Add
        </button>
      </div>

      {active.length > 0 && (
        <div className="qa-chips" aria-live="polite">
          {active.map((m) => (
            <span key={m.key} className="qa-chip">
              <span aria-hidden>{CHIP_ICON[m.key]}</span>
              {m.label}
              <button
                type="button"
                className="qa-chip-x"
                onClick={() => dismissChip(m.key)}
                aria-label={`Keep "${m.label}" as plain text`}
                title="Keep as plain text"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="composer-options">
          <div className="seg">
            <button
              type="button"
              className={eff.type === "oneoff" ? "seg-on" : ""}
              onClick={() => setManual("type", "oneoff", "repeat")}
            >
              One-off
            </button>
            <button
              type="button"
              className={eff.type === "daily" ? "seg-on" : ""}
              onClick={() => setManual("type", "daily", "repeat")}
            >
              Daily
            </button>
          </div>

          <select
            className="pill-select"
            value={eff.priority}
            onChange={(e) => setManual("priority", Number(e.target.value), "priority")}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {eff.type === "oneoff" && (
            <input
              type="date"
              className="time-input"
              value={eff.dueDate}
              onChange={(e) => setManual("dueDate", e.target.value, "due")}
              aria-label="Due date"
            />
          )}

          {eff.type === "daily" && (
            <WeekdayPicker
              value={eff.repeatDays}
              onChange={(v) => {
                setManual("repeatDays", v, "repeat");
                set("type", "daily");
              }}
            />
          )}

          <label className="reminder-toggle">
            <input
              type="checkbox"
              checked={eff.reminderEnabled}
              onChange={(e) => setManual("reminderEnabled", e.target.checked, "time")}
            />
            Remind me
          </label>
          {eff.reminderEnabled && (
            <input
              type="time"
              className="time-input"
              value={eff.reminderTime}
              onChange={(e) => {
                setManual("reminderTime", e.target.value, "time");
                set("reminderEnabled", true);
              }}
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
