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

/** Returns the local wall-clock time as "HH:mm" (24h). */
export function nowHHmm(date = new Date()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
