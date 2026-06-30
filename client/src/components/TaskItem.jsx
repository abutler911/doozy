import { useState } from "react";
import { priorityMeta } from "../lib/constants.js";
import { currentStreak, dueInfo, WEEKDAY_LETTERS } from "../lib/dates.js";

function repeatLabel(repeatDays) {
  if (!repeatDays || repeatDays.length === 0) return "daily";
  return [...repeatDays].sort().map((d) => WEEKDAY_LETTERS[d]).join("·");
}

/**
 * A single task row. Drag support is optional: when `dragListeners`/`dragRef`
 * are provided (by a sortable wrapper) a drag handle is shown. Every task has
 * a checklist button that expands an inline panel for adding/checking/removing
 * subtasks — no need to open the editor.
 */
export default function TaskItem({
  task,
  onToggle,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  onDelete,
  onCyclePriority,
  onEdit,
  dragRef,
  dragStyle,
  dragAttributes,
  dragListeners,
  isDragging,
}) {
  const p = priorityMeta(task.priority);
  const done = task.doneToday;
  const due = task.type === "oneoff" ? dueInfo(task.dueDate, task.completed) : null;
  const streak =
    task.type === "daily" ? currentStreak(task.completedDates, task.repeatDays) : 0;

  const subtasks = task.subtasks || [];
  const hasSubtasks = subtasks.length > 0;
  const subDone = subtasks.filter((s) => s.completed).length;
  // Auto-open if there are unchecked items so the list is visible at a glance.
  const [expanded, setExpanded] = useState(false);
  const [newItem, setNewItem] = useState("");

  function submitAdd(e) {
    e.preventDefault();
    const title = newItem.trim();
    if (!title) return;
    onAddSubtask(task, title);
    setNewItem("");
  }

  return (
    <li
      ref={dragRef}
      style={dragStyle}
      className={`task ${done ? "task-done" : ""} ${isDragging ? "task-dragging" : ""}`}
    >
      <div className="task-row">
        {dragListeners && (
          <button
            className="drag-handle"
            aria-label="Drag to reorder"
            {...dragAttributes}
            {...dragListeners}
          >
            ⠿
          </button>
        )}

        <button
          className={`check ${done ? "check-on" : ""}`}
          onClick={() => onToggle(task)}
          aria-label={done ? "Mark not done" : "Mark done"}
        >
          {done ? "✓" : ""}
        </button>

        <button className="task-body" onClick={() => onEdit(task)} title="Edit task">
          <span className="task-title">{task.title}</span>
          <div className="task-meta">
            {task.type === "daily" && (
              <span className="badge badge-daily">{repeatLabel(task.repeatDays)}</span>
            )}
            {streak > 0 && <span className="badge badge-streak">🔥 {streak}</span>}
            {due && (
              <span className={`badge ${due.overdue ? "badge-overdue" : "badge-due"}`}>
                {due.overdue ? "⚠ " : "📅 "}
                {due.label}
              </span>
            )}
            {task.reminderEnabled && task.reminderTime && (
              <span className="badge badge-bell">🔔 {task.reminderTime}</span>
            )}
            {task.notes && <span className="badge">📝</span>}
          </div>
        </button>

        <button
          className={`subtask-disclosure ${expanded ? "subtask-disclosure-on" : ""}`}
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          title={hasSubtasks ? "Checklist" : "Add a checklist"}
          aria-label={hasSubtasks ? "Show checklist" : "Add a checklist"}
        >
          <span aria-hidden>☑</span>
          {hasSubtasks && (
            <span className="subtask-count">
              {subDone}/{subtasks.length}
            </span>
          )}
        </button>

        <button
          className={`prio-dot ${p.className}`}
          title={`${p.label} priority — click to change`}
          onClick={() => onCyclePriority(task)}
        >
          {p.short}
        </button>

        <button
          className="icon-btn delete"
          onClick={() => onDelete(task)}
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>

      {expanded && (
        <div className="subtasks">
          {hasSubtasks && (
            <ul className="subtask-list">
              {subtasks.map((sub) => (
                <li
                  key={sub._id}
                  className={`subtask ${sub.completed ? "subtask-done" : ""}`}
                >
                  <button
                    className={`check check-sm ${sub.completed ? "check-on" : ""}`}
                    onClick={() => onToggleSubtask(task, sub._id)}
                    aria-label={sub.completed ? "Mark not done" : "Mark done"}
                  >
                    {sub.completed ? "✓" : ""}
                  </button>
                  <span className="subtask-title">{sub.title}</span>
                  <button
                    className="icon-btn delete subtask-delete"
                    onClick={() => onDeleteSubtask(task, sub._id)}
                    aria-label="Remove item"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form className="subtask-add" onSubmit={submitAdd}>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder="Add an item…"
              aria-label="New checklist item"
            />
            <button type="submit" className="btn btn-sm">
              Add
            </button>
          </form>
        </div>
      )}
    </li>
  );
}
