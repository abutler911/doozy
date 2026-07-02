/**
 * Timezone-aware helpers. We key "daily" tasks and reminders off the local
 * calendar day / clock in process.env.TZ (defaults to system tz).
 */

const TZ = process.env.TZ || undefined;

/** Returns the local date as "YYYY-MM-DD". */
export function todayStr(date = new Date()) {
  // en-CA gives ISO-style YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Day of week (0=Sun..6=Sat) for the local calendar day. */
export function todayWeekday(date = new Date()) {
  // Parse the local YYYY-MM-DD at UTC midnight so getUTCDay gives that
  // date's weekday regardless of the runtime's own offset.
  return new Date(`${todayStr(date)}T00:00:00Z`).getUTCDay();
}

/** Returns the local wall-clock time as "HH:mm" (24h). */
export function nowHHmm(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

/** Shift a "YYYY-MM-DD" string by n days (pure calendar math, no TZ). */
export function shiftDateStr(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Weekday (0=Sun..6=Sat) of a "YYYY-MM-DD" string. */
export function weekdayOf(dateStr) {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/** Is a ritual scheduled on the given date? Empty repeatDays = every day. */
function scheduledOn(dateStr, repeatDays) {
  if (!repeatDays || repeatDays.length === 0) return true;
  return repeatDays.includes(weekdayOf(dateStr));
}

/**
 * Current streak for a daily ritual — mirrors the client's calculation.
 * Counts back over scheduled days only; today not being done yet doesn't
 * break the streak.
 */
export function currentStreak(completedDates = [], repeatDays = []) {
  if (!completedDates.length) return 0;
  const set = new Set(completedDates);
  let cursor = todayStr();
  if (scheduledOn(cursor, repeatDays) && !set.has(cursor)) {
    cursor = shiftDateStr(cursor, -1);
  }
  let streak = 0;
  for (let i = 0; i < 730; i++) {
    if (scheduledOn(cursor, repeatDays)) {
      if (set.has(cursor)) streak += 1;
      else break;
    }
    cursor = shiftDateStr(cursor, -1);
  }
  return streak;
}
