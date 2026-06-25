import { priorityMeta } from "../lib/constants.js";
import { currentStreak, dueInfo } from "../lib/dates.js";

/**
 * A single task row. Drag support is optional: when `dragListeners`/`dragRef`
 * are provided (by a sortable wrapper) a drag handle is shown.
 */
export default function TaskItem({
  task,
  onToggle,
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
  const streak = task.type === "daily" ? currentStreak(task.completedDates) : 0;

  return (
    <li
      ref={dragRef}
      style={dragStyle}
      className={`task ${done ? "task-done" : ""} ${isDragging ? "task-dragging" : ""}`}
    >
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
          {task.type === "daily" && <span className="badge badge-daily">daily</span>}
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
    </li>
  );
}
