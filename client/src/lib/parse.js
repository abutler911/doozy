/**
 * Natural-language quick-add parser for the task composer.
 *
 * Lets you type things like:
 *   "pay rent fri 9am !urgent"
 *   "call mom tomorrow at 6pm"
 *   "read every weekday !low"
 *   "standup daily 9:15am"
 *
 * and pulls out the due date, reminder time, priority, and recurrence,
 * leaving a clean title behind. It never throws and only reports the
 * attributes it actually finds, so the composer can merge it with any
 * manual choices.
 */
import { PRIORITIES } from "./constants.js";
import { WEEKDAY_NAMES } from "./dates.js";

/** Local "YYYY-MM-DD" for a Date. */
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "YYYY-MM-DD" n days from today. */
function daysFromToday(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

const WEEKDAYS = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, weds: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

const MONTHS = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2,
  apr: 3, april: 3, may: 4, jun: 5, june: 5, jul: 6, july: 6,
  aug: 7, august: 7, sep: 8, sept: 8, september: 8, oct: 9, october: 9,
  nov: 10, november: 10, dec: 11, december: 11,
};

/** Resolve a weekday word (any common form) to 0..6, or null. */
function dowNum(word) {
  const w = word.toLowerCase();
  if (w in WEEKDAYS) return WEEKDAYS[w];
  const p3 = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
  return w.slice(0, 3) in p3 ? p3[w.slice(0, 3)] : null;
}

// A single weekday token (mon, tues, wednesday, ...). Longest forms first so
// the regex prefers the full word over a prefix.
const DOW =
  "(?:mondays?|monday|mon|tuesdays?|tuesday|tues|tue|wednesdays?|wednesday|weds|wed|thursdays?|thursday|thurs|thur|thu|fridays?|friday|fri|saturdays?|saturday|sat|sundays?|sunday|sun)";

const PRIORITY_WORDS = {
  urgent: 4, critical: 4, asap: 4,
  high: 3, important: 3,
  med: 2, medium: 2, normal: 2,
  low: 1, whenever: 1,
};

/** Friendly label for a "YYYY-MM-DD" due date. */
function dateLabel(dateStr) {
  if (dateStr === daysFromToday(0)) return "Today";
  if (dateStr === daysFromToday(1)) return "Tomorrow";
  const d = new Date(`${dateStr}T00:00:00`);
  // Within the next week, show the weekday name; otherwise "Mon D".
  for (let i = 2; i < 7; i++) {
    if (dateStr === daysFromToday(i)) return WEEKDAY_NAMES[d.getDay()];
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "09:00" -> "9:00am" style label. */
function timeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const ampm = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, "0")}${ampm}`;
}

/** Next occurrence (>= today) of weekday w; "next" pushes a week further. */
function weekdayDate(w, next) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let ahead = (w - today.getDay() + 7) % 7;
  if (next) ahead = ahead === 0 ? 7 : ahead + 7;
  return daysFromToday(ahead);
}

/**
 * Parse a raw composer string.
 * @returns {{ title: string, fields: object, tokens: {type:string,label:string}[] }}
 *   `fields` contains only detected keys; `tokens` are display chips.
 */
export function parseQuickAdd(raw) {
  let text = ` ${raw} `;
  const fields = {};
  const tokens = [];

  // Remove a matched chunk (with its surrounding space) from the working text.
  const strip = (re) => {
    text = text.replace(re, " ");
  };

  // --- Reminder time: "9am", "9:30 pm", "at 14:00", "@ 6" ---
  const timeRe =
    /\s(?:@|at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b|\s(?:@|at\s+)(\d{1,2})(?::(\d{2}))\b/i;
  const tm = text.match(timeRe);
  if (tm) {
    let h, min;
    if (tm[1] != null) {
      h = Number(tm[1]);
      min = Number(tm[2] || 0);
      const mer = tm[3].toLowerCase();
      if (mer === "pm" && h < 12) h += 12;
      if (mer === "am" && h === 12) h = 0;
    } else {
      h = Number(tm[4]);
      min = Number(tm[5] || 0);
    }
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      const hhmm = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      fields.reminderTime = hhmm;
      fields.reminderEnabled = true;
      tokens.push({ type: "time", label: timeLabel(hhmm) });
      text = text.replace(tm[0], " ");
    }
  }

  // --- Recurrence: daily / everyday / weekdays / weekends / every <day> ---
  let recurrenceMatched = false;
  const everyDay = text.match(/\s(every\s*day|everyday|daily)\b/i);
  if (everyDay) {
    fields.type = "daily";
    fields.repeatDays = [];
    tokens.push({ type: "daily", label: "Daily" });
    text = text.replace(everyDay[0], " ");
    recurrenceMatched = true;
  }
  const weekdaysM = !recurrenceMatched && text.match(/\s(?:every\s+)?(weekdays?)\b/i);
  if (weekdaysM) {
    fields.type = "daily";
    fields.repeatDays = [1, 2, 3, 4, 5];
    tokens.push({ type: "daily", label: "Weekdays" });
    text = text.replace(weekdaysM[0], " ");
    recurrenceMatched = true;
  }
  const weekendsM = !recurrenceMatched && text.match(/\s(?:every\s+)?(weekends?)\b/i);
  if (weekendsM) {
    fields.type = "daily";
    fields.repeatDays = [0, 6];
    tokens.push({ type: "daily", label: "Weekends" });
    text = text.replace(weekendsM[0], " ");
    recurrenceMatched = true;
  }
  // "every mon", "every monday and wednesday", or a bare run "mon wed fri".
  if (!recurrenceMatched) {
    const everyDow = text.match(
      new RegExp(`\\severy\\s+(${DOW}\\b(?:[\\s,]+(?:and\\s+|&\\s+)?${DOW}\\b)*)`, "i")
    );
    const multiDow =
      !everyDow &&
      text.match(new RegExp(`\\s(${DOW}\\b(?:[\\s,]+(?:and\\s+|&\\s+)?${DOW}\\b)+)`, "i"));
    const m = everyDow || multiDow;
    if (m) {
      const days = [];
      for (const w of m[1].toLowerCase().matchAll(/[a-z]+/g)) {
        const n = dowNum(w[0]);
        if (n != null && !days.includes(n)) days.push(n);
      }
      // A bare run needs 2+ distinct days to count as recurrence (a single
      // bare weekday is treated as a due date below).
      if (days.length >= (everyDow ? 1 : 2)) {
        days.sort();
        fields.type = "daily";
        fields.repeatDays = days;
        tokens.push({
          type: "daily",
          label: "Every " + days.map((d) => WEEKDAY_NAMES[d]).join(", "),
        });
        text = text.replace(m[0], " ");
        recurrenceMatched = true;
      }
    }
  }

  // --- Due date (skip if it's a recurring daily task) ---
  if (!recurrenceMatched) {
    let due = null;
    let consumed = null;

    const rel = text.match(/\s(today|tonight|tomorrow|tmr|tom)\b/i);
    const inN = text.match(/\sin\s+(\d{1,3})\s+(day|days|week|weeks)\b/i);
    const nextDow = text.match(new RegExp(`\\snext\\s+(${DOW})\\b`, "i"));
    const bareDow = text.match(new RegExp(`\\s(${DOW})\\b`, "i"));
    // "jun 30", "june 30", "30 jun"
    const monthDay =
      /\s(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b|\s(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i;

    if (rel) {
      const w = rel[1].toLowerCase();
      due = w === "today" || w === "tonight" ? daysFromToday(0) : daysFromToday(1);
      consumed = rel[0];
    } else if (inN) {
      const n = Number(inN[1]);
      const unit = inN[2].toLowerCase().startsWith("week") ? 7 : 1;
      due = daysFromToday(n * unit);
      consumed = inN[0];
    } else if (nextDow) {
      due = weekdayDate(dowNum(nextDow[1]), true);
      consumed = nextDow[0];
    } else if (text.match(monthDay)) {
      const mm = text.match(monthDay);
      let monthIdx, dayNum;
      if (mm[1] != null) {
        monthIdx = MONTHS[mm[1].toLowerCase()];
        dayNum = Number(mm[2]);
      } else {
        monthIdx = MONTHS[mm[4].toLowerCase()];
        dayNum = Number(mm[3]);
      }
      if (monthIdx != null && dayNum >= 1 && dayNum <= 31) {
        const now = new Date();
        let year = now.getFullYear();
        // If the date already passed this year, roll to next year.
        const candidate = new Date(year, monthIdx, dayNum);
        candidate.setHours(0, 0, 0, 0);
        const t0 = new Date();
        t0.setHours(0, 0, 0, 0);
        if (candidate < t0) year += 1;
        due = ymd(new Date(year, monthIdx, dayNum));
        consumed = mm[0];
      }
    } else if (bareDow) {
      due = weekdayDate(dowNum(bareDow[1]), false);
      consumed = bareDow[0];
    }

    if (due) {
      fields.dueDate = due;
      tokens.push({ type: "date", label: dateLabel(due) });
      text = text.replace(consumed, " ");
    }
  }

  // If a time was given without any date or recurrence, assume today.
  if (fields.reminderTime && !fields.dueDate && fields.type !== "daily") {
    fields.dueDate = daysFromToday(0);
    tokens.unshift({ type: "date", label: "Today" });
  }

  // --- Priority: "!urgent", "!high", "p1".."p4", "!!!"/"!!" ---
  const pWord = text.match(/\s!(urgent|critical|asap|high|important|med|medium|normal|low|whenever)\b/i);
  const pNum = text.match(/\s(?:p([1-4])|!([1-4]))\b/i);
  const bangs = text.match(/\s(!{1,3})(?=\s)/);
  if (pWord) {
    fields.priority = PRIORITY_WORDS[pWord[1].toLowerCase()];
    text = text.replace(pWord[0], " ");
  } else if (pNum) {
    // p1 = low ... p4 = urgent (matches priority values directly).
    fields.priority = Number(pNum[1] || pNum[2]);
    text = text.replace(pNum[0], " ");
  } else if (bangs) {
    const n = bangs[1].length;
    fields.priority = n >= 3 ? 4 : n === 2 ? 3 : 2;
    text = text.replace(bangs[0], " ");
  }
  if (fields.priority) {
    const meta = PRIORITIES.find((p) => p.value === fields.priority);
    tokens.push({ type: "priority", label: meta ? meta.label : "Priority" });
  }

  const title = text.replace(/\s+/g, " ").trim();
  return { title, fields, tokens };
}
