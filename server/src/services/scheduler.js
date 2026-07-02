import cron from "node-cron";
import { Task } from "../models/Task.js";
import { Settings } from "../models/Settings.js";
import { sendSms } from "./textbelt.js";
import { sendPushToAll } from "./webpush.js";
import { todayStr, nowHHmm, todayWeekday, currentStreak } from "./time.js";

const PRIORITY_LABEL = { 1: "Low", 2: "Med", 3: "High", 4: "URGENT" };

// Action buttons shown on task-reminder push notifications (handled in the
// client service worker). "Done" completes idempotently; "Snooze" re-fires
// the reminder in 30 minutes.
const REMINDER_ACTIONS = [
  { action: "done", title: "Done ✓" },
  { action: "snooze", title: "Snooze 30m" },
];

function resolvePhone(settings) {
  return (settings.phone && settings.phone.trim()) || process.env.REMINDER_PHONE || "";
}

/** Is a task considered "done" for today? */
function isDoneToday(task, today) {
  if (task.type === "daily") return task.completedDates.includes(today);
  return task.completed;
}

/** Send one task reminder over SMS + (optionally) actionable push. */
async function sendTaskReminder(task, settings, phone) {
  const tag = PRIORITY_LABEL[task.priority] || "";
  const msg = `Doozy reminder${tag ? ` [${tag}]` : ""}: ${task.title}`;

  const sms = await sendSms(phone, msg);
  let pushed = 0;
  if (settings.pushEnabled) {
    pushed = await sendPushToAll({
      title: "Doozy reminder",
      body: task.title,
      url: "/",
      taskId: String(task._id),
      tag: `doozy-task-${task._id}`,
      actions: REMINDER_ACTIONS,
    });
  }
  return sms.success || pushed > 0;
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
    // Mark sent if any channel delivered, so we don't retry every minute.
    if (await sendTaskReminder(task, settings, phone)) {
      task.lastReminderSent = today;
      await task.save();
    }
  }
}

/** Re-fire reminders whose snooze window (set from the notification) is up. */
async function runSnoozedReminders(today) {
  const due = await Task.find({
    reminderEnabled: true,
    reminderSnoozedUntil: { $lte: new Date() },
  });
  if (!due.length) return;

  const settings = await Settings.getGlobal();
  const phone = resolvePhone(settings);

  for (const task of due) {
    // Whatever happens next, the snooze is consumed.
    task.reminderSnoozedUntil = null;
    if (!isDoneToday(task, today)) {
      await sendTaskReminder(task, settings, phone);
    }
    await task.save();
  }
}

/** Warn about rituals with a live streak that are still undone this evening. */
async function runStreakNudge(today, hhmm) {
  const settings = await Settings.getGlobal();
  if (!settings.streakNudgeEnabled) return;
  if (settings.streakNudgeTime !== hhmm) return;
  if (settings.lastStreakNudgeSent === today) return;

  const weekday = todayWeekday();
  const rituals = await Task.find({ type: "daily" }).lean();
  const atRisk = rituals
    .filter(
      (t) =>
        (!t.repeatDays?.length || t.repeatDays.includes(weekday)) &&
        !t.completedDates.includes(today)
    )
    .map((t) => ({ title: t.title, streak: currentStreak(t.completedDates, t.repeatDays) }))
    .filter((t) => t.streak > 0)
    .sort((a, b) => b.streak - a.streak);

  // Nothing at risk — mark the day handled so we don't re-check all evening.
  settings.lastStreakNudgeSent = today;
  if (!atRisk.length) {
    await settings.save();
    return;
  }

  const lines = atRisk
    .slice(0, 4)
    .map((t) => `• ${t.title} — ${t.streak} day${t.streak === 1 ? "" : "s"}`)
    .join("\n");
  const extra = atRisk.length > 4 ? `\n…and ${atRisk.length - 4} more` : "";
  const msg = `Doozy 🔥 Streak${atRisk.length === 1 ? "" : "s"} at risk tonight:\n${lines}${extra}`;

  const phone = resolvePhone(settings);
  const sms = await sendSms(phone, msg);
  let pushed = 0;
  if (settings.pushEnabled) {
    pushed = await sendPushToAll({
      title: "🔥 Streak at risk",
      body: atRisk
        .slice(0, 4)
        .map((t) => `${t.title} (${t.streak}d)`)
        .join(", "),
      url: "/",
      tag: "doozy-streak-nudge",
    });
  }
  if (!sms.success && pushed === 0) {
    // Neither channel delivered — allow a retry on the next tick.
    settings.lastStreakNudgeSent = null;
  }
  await settings.save();
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
      await runSnoozedReminders(today);
      await runStreakNudge(today, hhmm);
      await runDailySummary(today, hhmm);
    } catch (err) {
      console.error("[scheduler] tick error:", err.message);
    }
  };

  cron.schedule("* * * * *", tick);
  console.log("[scheduler] started (checks every minute)");
}
