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
