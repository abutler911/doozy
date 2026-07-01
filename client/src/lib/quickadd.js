import { todayStr, shift, WEEKDAY_NAMES } from "./dates.js";
import { priorityMeta } from "./constants.js";

/**
 * Natural-language quick-add parser for the composer. Scans a title as the
 * user types and pulls out:
 *
 *   - a due date        — "today", "tomorrow"/"tmrw", "next week", weekday
 *                         names ("friday", "on fri", "next mon")
 *   - a reminder time   — "at 2pm", "2:30pm", "at 14:00"
 *   - a priority        — "!urgent", "!high", "!med", "!low" (or "!1".."!4")
 *   - a recurrence      — "every day", "every weekday", "every mon wed fri"
 *                         (turns the task into a daily ritual)
 *
 * Returns { matches } where each match is { key, label, value, start, end }.
 * `start`/`end` index into the ORIGINAL string so the matched tokens can be
 * stripped from the title on submit (see stripQuickAdd). Matching is done on
 * a working copy where consumed spans are blanked out, so e.g. the "friday"
 * inside "every friday" is never double-counted as a due date.
 */

// One weekday word: full name or common abbreviation ("tue", "thurs", ...).
const DAY = "(?:sun(?:day)?|mon(?:day)?|tues?(?:day)?|wed(?:nesday)?|thur?s?(?:day)?|fri(?:day)?|sat(?:urday)?)";
const FULL_DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function dayNum(word) {
  const w = word.toLowerCase();
  if (w.startsWith("su")) return 0;
  if (w.startsWith("m")) return 1;
  if (w.startsWith("tu")) return 2;
  if (w.startsWith("w")) return 3;
  if (w.startsWith("th")) return 4;
  if (w.startsWith("f")) return 5;
  return 6;
}

function dueLabel(dateStr) {
  const today = todayStr();
  if (dateStr === today) return "Today";
  if (dateStr === shift(today, 1)) return "Tomorrow";
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function timeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

export function parseQuickAdd(raw) {
  const matches = [];
  let work = raw;

  // Record a match and blank its span so later patterns can't re-match it.
  // `start`/`end` index into the original string (blanking preserves length).
  function consume(key, label, value, start, end) {
    matches.push({ key, label, value, start, end });
    work = work.slice(0, start) + " ".repeat(end - start) + work.slice(end);
  }

  // --- Priority: "!high", "!urgent", "!2" ---
  {
    const m = /(^|\s)!(urgent|high|med|medium|low|[1-4])(?=\s|$)/i.exec(work);
    if (m) {
      const word = m[2].toLowerCase();
      const byWord = { urgent: 4, high: 3, medium: 2, med: 2, low: 1 };
      const value = byWord[word] ?? Number(word);
      const start = m.index + m[1].length;
      consume("priority", priorityMeta(value).label, value, start, start + m[0].length - m[1].length);
    }
  }

  // --- Recurrence: "every day", "every weekday", "every mon wed fri" ---
  {
    const re = new RegExp(
      `(^|\\s)every\\s+(days?|weekdays?|weekends?|${DAY}s?(?:(?:\\s*,\\s*|\\s+and\\s+|\\s*&\\s*|\\s+)${DAY}s?)*)(?=\\s|$|[.,!?])`,
      "i"
    );
    const m = re.exec(work);
    if (m) {
      const body = m[2].toLowerCase();
      let days;
      let label;
      if (body.startsWith("day")) {
        days = [];
        label = "Every day";
      } else if (body.startsWith("weekday")) {
        days = [1, 2, 3, 4, 5];
        label = "Weekdays";
      } else if (body.startsWith("weekend")) {
        days = [0, 6];
        label = "Weekends";
      } else {
        const words = body.match(new RegExp(DAY, "gi")) || [];
        days = [...new Set(words.map(dayNum))].sort();
        label = days.map((d) => WEEKDAY_NAMES[d]).join(" · ");
      }
      const start = m.index + m[1].length;
      consume("repeat", label, days, start, start + m[0].length - m[1].length);
    }
  }

  // --- Reminder time: "at 2pm", "at 14:00", "2:30pm" (am/pm required
  //     when there's no "at", so plain numbers stay untouched) ---
  {
    const m =
      /(^|\s)(?:at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?|(\d{1,2})(?::(\d{2}))?(am|pm))(?=\s|$|[.,!?])/i.exec(
        work
      );
    if (m) {
      let h = Number(m[2] ?? m[5]);
      const min = Number(m[3] ?? m[6] ?? 0);
      const ap = (m[4] || m[7] || "").toLowerCase();
      if (ap === "pm" && h < 12) h += 12;
      else if (ap === "am" && h === 12) h = 0;
      // "at 5" with no am/pm and no minutes: small hours mean afternoon.
      else if (!ap && m[3] == null && h >= 1 && h <= 7) h += 12;
      if (h <= 23 && min <= 59) {
        const value = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        const start = m.index + m[1].length;
        consume("time", timeLabel(value), value, start, start + m[0].length - m[1].length);
      }
    }
  }

  // --- Due date (first hit wins): today / tomorrow / next week / weekday ---
  {
    const today = todayStr();
    let m;
    if ((m = /(^|\s)(today|tonight)(?=\s|$|[.,!?])/i.exec(work))) {
      const start = m.index + m[1].length;
      consume("due", dueLabel(today), today, start, start + m[0].length - m[1].length);
    } else if ((m = /(^|\s)(tomorrow|tmrw|tmr)(?=\s|$|[.,!?])/i.exec(work))) {
      const value = shift(today, 1);
      const start = m.index + m[1].length;
      consume("due", dueLabel(value), value, start, start + m[0].length - m[1].length);
    } else if ((m = /(^|\s)next\s+week(?=\s|$|[.,!?])/i.exec(work))) {
      const value = shift(today, 7);
      const start = m.index + m[1].length;
      consume("due", dueLabel(value), value, start, start + m[0].length - m[1].length);
    } else {
      // Weekday names. Bare abbreviations ("sun", "sat") are too easy to hit
      // by accident, so they need an "on/next/this" prefix; full names match
      // on their own.
      const re = new RegExp(`(^|\\s)(?:(on|next|this)\\s+)?(${DAY})(?=\\s|$|[.,!?])`, "gi");
      while ((m = re.exec(work))) {
        const prefix = (m[2] || "").toLowerCase();
        const word = m[3].toLowerCase();
        if (!prefix && !FULL_DAY_NAMES.includes(word)) continue;
        const target = dayNum(word);
        const todayWd = new Date(`${today}T00:00:00`).getDay();
        let delta = (target - todayWd + 7) % 7;
        if (prefix === "next") delta = delta === 0 ? 7 : delta + 7;
        else if (delta === 0 && prefix !== "this") delta = 7; // bare "monday" on a Monday → next one
        const value = shift(today, delta);
        const start = m.index + m[1].length;
        consume("due", dueLabel(value), value, start, start + m[0].length - m[1].length);
        break;
      }
    }
  }

  return { matches };
}

/**
 * Remove the matched tokens from the original title (skipping any the user
 * dismissed), then tidy up leftover whitespace/punctuation.
 */
export function stripQuickAdd(raw, matches, ignored = new Set()) {
  const spans = matches
    .filter((m) => !ignored.has(m.key))
    .sort((a, b) => a.start - b.start);
  let out = "";
  let pos = 0;
  for (const s of spans) {
    out += raw.slice(pos, s.start);
    pos = s.end;
  }
  out += raw.slice(pos);
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.?;:])/g, "$1")
    .trim()
    .replace(/^[-–—,;:\s]+|[-–—,;:\s]+$/g, "");
}
