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

export const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
export const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday (0=Sun..6=Sat) of a "YYYY-MM-DD" string. */
function weekdayOf(dateStr) {
  return new Date(`${dateStr}T00:00:00`).getDay();
}

/** Is this ritual scheduled on the given date? Empty repeatDays = every day. */
function scheduledOn(dateStr, repeatDays) {
  if (!repeatDays || repeatDays.length === 0) return true;
  return repeatDays.includes(weekdayOf(dateStr));
}

/**
 * Current streak for a daily/recurring task. Counts back over scheduled days
 * only: a missed scheduled day breaks the streak; non-scheduled days are
 * skipped. If today is scheduled but not yet done, today doesn't break it.
 */
export function currentStreak(completedDates = [], repeatDays = []) {
  if (!completedDates.length) return 0;
  const set = new Set(completedDates);
  const today = todayStr();
  let cursor = today;
  // Don't penalize for today not being done yet.
  if (scheduledOn(cursor, repeatDays) && !set.has(cursor)) cursor = shift(cursor, -1);

  let streak = 0;
  // Walk back a bounded window; stop at the first missed scheduled day.
  for (let i = 0; i < 730; i++) {
    if (scheduledOn(cursor, repeatDays)) {
      if (set.has(cursor)) streak += 1;
      else break;
    }
    cursor = shift(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive scheduled days completed. */
export function bestStreak(completedDates = [], repeatDays = []) {
  if (!completedDates.length) return 0;
  const set = new Set(completedDates);
  const sorted = [...set].sort();
  let best = 0;
  let cursor = sorted[0];
  const end = todayStr();
  let run = 0;
  for (let i = 0; i < 3650 && cursor <= end; i++) {
    if (scheduledOn(cursor, repeatDays)) {
      if (set.has(cursor)) {
        run += 1;
        best = Math.max(best, run);
      } else {
        run = 0;
      }
    }
    cursor = shift(cursor, 1);
  }
  return best;
}

/** Array of the last n calendar days as "YYYY-MM-DD", oldest first. */
export function lastNDays(n) {
  const today = todayStr();
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(shift(today, -i));
  return out;
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
