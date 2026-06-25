/** Local "YYYY-MM-DD" for a Date (defaults to today). */
export function todayStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Shift a "YYYY-MM-DD" string by n days. */
function shift(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return todayStr(dt);
}

/**
 * Current streak for a daily task: count back from today (or yesterday, if
 * today isn't done yet) over consecutive completed dates.
 */
export function currentStreak(completedDates = []) {
  if (!completedDates.length) return 0;
  const set = new Set(completedDates);
  const today = todayStr();
  let cursor = set.has(today) ? today : shift(today, -1);
  // If neither today nor yesterday is done, the streak is broken.
  if (!set.has(cursor)) return 0;
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shift(cursor, -1);
  }
  return streak;
}

/** Friendly due-date label + overdue flag. Accepts ISO date or null. */
export function dueInfo(dueDate, completed) {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const dueDay = todayStr(due);
  const today = todayStr();
  const overdue = !completed && dueDay < today;
  let label;
  if (dueDay === today) label = "Today";
  else if (dueDay === shift(today, 1)) label = "Tomorrow";
  else
    label = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return { label, overdue };
}

/** Convert an ISO datetime to the "YYYY-MM-DD" value an <input type=date> wants. */
export function toDateInput(iso) {
  if (!iso) return "";
  return todayStr(new Date(iso));
}
