import cron from "node-cron";
import { Task } from "../models/Task.js";
import { Settings } from "../models/Settings.js";
import { sendSms } from "./textbelt.js";
import { sendPushToAll } from "./webpush.js";
import { todayStr, nowHHmm, todayWeekday } from "./time.js";

const PRIORITY_LABEL = { 1: "Low", 2: "Med", 3: "High", 4: "URGENT" };

function resolvePhone(settings) {
  return (settings.phone && settings.phone.trim()) || process.env.REMINDER_PHONE || "";
}

/** Is a task considered "done" for today? */
function isDoneToday(task, today) {
  if (task.type === "daily") return task.completedDates.includes(today);
  return task.completed;
}

/** Send any per-task reminders whose time has arrived and not yet sent today. */
async function runTaskReminders(today, hhmm) {
  const settings = await Settings.getGlobal();
  const phone = resolvePhone(settings);

  const due = await Task.find({
    reminderEnabled: true,
    reminderTime: hhmm,
    lastReminderSent: { $ne: today },
  });

  const weekday = todayWeekday();
  for (const task of due) {
    // Skip recurring rituals that aren't scheduled for today's weekday.
    if (
      task.type === "daily" &&
      task.repeatDays?.length &&
      !task.repeatDays.includes(weekday)
    ) {
      continue;
    }
    if (isDoneToday(task, today)) {
      // Already done — skip but mark so we don't re-check all minute.
      task.lastReminderSent = today;
      await task.save();
      continue;
    }
    const tag = PRIORITY_LABEL[task.priority] || "";
    const msg = `Doozy reminder${tag ? ` [${tag}]` : ""}: ${task.title}`;

    const sms = await sendSms(phone, msg);
    let pushed = 0;
    if (settings.pushEnabled) {
      pushed = await sendPushToAll({ title: "Doozy reminder", body: task.title, url: "/" });
    }
    // Mark sent if any channel delivered, so we don't retry every minute.
    if (sms.success || pushed > 0) {
      task.lastReminderSent = today;
      await task.save();
    }
  }
}

/** Send the optional morning summary of today's open tasks. */
async function runDailySummary(today, hhmm) {
  const settings = await Settings.getGlobal();
  if (!settings.dailySummaryEnabled) return;
  if (settings.dailySummaryTime !== hhmm) return;
  if (settings.lastSummarySent === today) return;

  const phone = resolvePhone(settings);

  const tasks = await Task.find({
    $or: [
      { type: "daily" },
      { type: "oneoff", completed: false },
    ],
  })
    .sort({ priority: -1, order: 1 })
    .lean();

  const open = tasks.filter((t) => !isDoneToday(t, today));
  let msg;
  if (open.length === 0) {
    msg = "Doozy: You're all caught up today. 🎉";
  } else {
    const lines = open
      .slice(0, 8)
      .map((t) => `• ${t.title}`)
      .join("\n");
    const extra = open.length > 8 ? `\n…and ${open.length - 8} more` : "";
    msg = `Doozy — today's ${open.length} task${open.length === 1 ? "" : "s"}:\n${lines}${extra}`;
  }

  const sms = await sendSms(phone, msg);
  let pushed = 0;
  if (settings.pushEnabled) {
    pushed = await sendPushToAll({ title: "Doozy — today", body: msg, url: "/" });
  }
  if (sms.success || pushed > 0) {
    settings.lastSummarySent = today;
    await settings.save();
  }
}

/**
 * Start the once-a-minute cron. Each tick checks the local clock and fires
 * anything scheduled for the current minute. All sends are deduped per day.
 */
export function startScheduler() {
  const tick = async () => {
    try {
      const today = todayStr();
      const hhmm = nowHHmm();
      await runTaskReminders(today, hhmm);
      await runDailySummary(today, hhmm);
    } catch (err) {
      console.error("[scheduler] tick error:", err.message);
    }
  };

  cron.schedule("* * * * *", tick);
  console.log("[scheduler] started (checks every minute)");
}
