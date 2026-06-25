import { priorityMeta } from "../lib/constants.js";

export default function TaskItem({ task, onToggle, onDelete, onCyclePriority }) {
  const p = priorityMeta(task.priority);
  const done = task.doneToday;

  return (
    <li className={`task ${done ? "task-done" : ""}`}>
      <button
        className={`check ${done ? "check-on" : ""}`}
        onClick={() => onToggle(task)}
        aria-label={done ? "Mark not done" : "Mark done"}
      >
        {done ? "✓" : ""}
      </button>

      <div className="task-body">
        <span className="task-title">{task.title}</span>
        <div className="task-meta">
          {task.type === "daily" && <span className="badge badge-daily">daily</span>}
          {task.reminderEnabled && task.reminderTime && (
            <span className="badge badge-bell">🔔 {task.reminderTime}</span>
          )}
        </div>
      </div>

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
