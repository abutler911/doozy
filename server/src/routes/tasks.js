import { Router } from "express";
import mongoose from "mongoose";
import { Task } from "../models/Task.js";
import { Settings } from "../models/Settings.js";
import { sendSms } from "../services/textbelt.js";
import { todayStr, todayWeekday } from "../services/time.js";

const router = Router();

/** Shape a task for the client, adding `doneToday` + `scheduledToday` flags. */
function present(task) {
  const today = todayStr();
  const obj = task.toObject ? task.toObject() : task;
  const doneToday =
    obj.type === "daily" ? obj.completedDates.includes(today) : obj.completed;
  // A daily ritual is "scheduled today" if it repeats every day (empty
  // repeatDays) or today's weekday is in its repeatDays.
  const scheduledToday =
    obj.type !== "daily" ||
    !obj.repeatDays?.length ||
    obj.repeatDays.includes(todayWeekday());
  return { ...obj, doneToday, scheduledToday };
}

/** Keep only valid, unique weekday numbers (0..6). */
function sanitizeRepeatDays(days) {
  if (!Array.isArray(days)) return [];
  return [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
}

const RECURRENCES = ["weekly", "monthly", "yearly"];

/** Validate a recurrence cadence, returning null for anything unrecognized. */
function sanitizeRecurrence(value) {
  return RECURRENCES.includes(value) ? value : null;
}

/**
 * Next due date for a recurring to-do. Steps the cadence forward from the
 * current due date, skipping any occurrences already in the past so an overdue
 * task lands on its next future slot.
 */
function nextDue(fromDate, freq) {
  const bump = (d) => {
    if (freq === "weekly") d.setDate(d.getDate() + 7);
    else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
    else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
    return d;
  };
  const todayMidnight = new Date(`${todayStr()}T00:00:00`);
  let next = bump(new Date(fromDate));
  let guard = 0;
  while (next < todayMidnight && guard++ < 1200) next = bump(next);
  return next;
}

/**
 * Normalize an incoming subtasks array: drop blank titles, keep the `_id`
 * when present (so existing items aren't recreated), coerce `completed`.
 */
function sanitizeSubtasks(subtasks) {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .map((s) => {
      const title = typeof s?.title === "string" ? s.title.trim() : "";
      if (!title) return null;
      // Always give every item a stable `_id`. `findByIdAndUpdate` (used by
      // PATCH) does NOT mint `_id`s for new subdocuments the way `.save()`
      // does, so without this new items would persist id-less and the inline
      // toggle (which addresses subtasks by `_id`) could never reach them.
      const _id =
        s._id && mongoose.isValidObjectId(s._id)
          ? s._id
          : new mongoose.Types.ObjectId();
      return { _id, title, completed: !!s.completed };
    })
    .filter(Boolean);
}

// GET /api/tasks — all tasks, sorted by priority then manual order.
router.get("/", async (_req, res) => {
  const tasks = await Task.find().sort({ priority: -1, order: 1, createdAt: 1 });
  res.json(tasks.map(present));
});

// POST /api/tasks — create.
router.post("/", async (req, res) => {
  const {
    title,
    notes,
    type,
    priority,
    dueDate,
    reminderTime,
    reminderEnabled,
    repeatDays,
    recurrence,
    subtasks,
  } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  // Put new tasks at the top of their priority bucket.
  const min = await Task.findOne().sort({ order: 1 }).select("order");
  const order = (min?.order ?? 0) - 1;

  const finalType = type === "daily" ? "daily" : "oneoff";
  // Recurrence only applies to one-off tasks, and needs a due date to anchor
  // the cadence — default to today if none was given.
  const recur = finalType === "oneoff" ? sanitizeRecurrence(recurrence) : null;
  const due = dueDate || (recur ? new Date().toISOString() : null);

  const task = await Task.create({
    title: title.trim(),
    notes: notes || "",
    type: finalType,
    priority: [1, 2, 3, 4].includes(priority) ? priority : 2,
    dueDate: due,
    reminderTime: reminderTime || null,
    reminderEnabled: !!reminderEnabled,
    repeatDays: sanitizeRepeatDays(repeatDays),
    recurrence: recur,
    subtasks: sanitizeSubtasks(subtasks),
    order,
  });
  res.status(201).json(present(task));
});

// PATCH /api/tasks/:id — update arbitrary fields.
router.patch("/:id", async (req, res) => {
  const allowed = [
    "title",
    "notes",
    "type",
    "priority",
    "dueDate",
    "order",
    "completed",
    "reminderTime",
    "reminderEnabled",
    "repeatDays",
    "recurrence",
    "subtasks",
  ];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  if ("repeatDays" in updates) updates.repeatDays = sanitizeRepeatDays(updates.repeatDays);
  if ("recurrence" in updates) updates.recurrence = sanitizeRecurrence(updates.recurrence);
  // Daily rituals can't carry a one-off recurrence cadence.
  if (updates.type === "daily") updates.recurrence = null;
  if ("subtasks" in updates) updates.subtasks = sanitizeSubtasks(updates.subtasks);
  const task = await Task.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json(present(task));
});

// POST /api/tasks/:id/toggle — flip done state (today, for daily tasks).
router.post("/:id/toggle", async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });

  if (task.type === "daily") {
    const today = todayStr();
    const idx = task.completedDates.indexOf(today);
    if (idx >= 0) task.completedDates.splice(idx, 1);
    else task.completedDates.push(today);
  } else if (!task.completed && task.recurrence) {
    // Completing a recurring to-do rolls it forward to its next occurrence
    // instead of finishing it. Log the completion date for future insights.
    const today = todayStr();
    if (!task.completedDates.includes(today)) task.completedDates.push(today);
    task.dueDate = nextDue(task.dueDate || new Date(), task.recurrence);
    task.completed = false;
  } else {
    task.completed = !task.completed;
  }
  await task.save();
  res.json(present(task));
});

// POST /api/tasks/:id/complete — idempotent "mark done". Used by the
// notification action buttons, where a tap on a stale notification must
// never un-complete a task the way /toggle would.
router.post("/:id/complete", async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });

  const today = todayStr();
  if (task.type === "daily") {
    if (!task.completedDates.includes(today)) task.completedDates.push(today);
  } else if (!task.completed && task.recurrence) {
    // Same roll-forward behavior as /toggle for recurring to-dos.
    if (!task.completedDates.includes(today)) task.completedDates.push(today);
    task.dueDate = nextDue(task.dueDate || new Date(), task.recurrence);
  } else {
    task.completed = true;
  }
  task.reminderSnoozedUntil = null;
  await task.save();
  res.json(present(task));
});

// POST /api/tasks/:id/snooze — re-fire the reminder later. Body: { minutes }.
router.post("/:id/snooze", async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const raw = Number(req.body?.minutes);
  const minutes = Number.isFinite(raw) ? Math.min(720, Math.max(5, raw)) : 30;
  task.reminderSnoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await task.save();
  res.json({ ok: true, until: task.reminderSnoozedUntil });
});

// POST /api/tasks/:id/subtasks — append a checklist item. Body: { title }.
router.post("/:id/subtasks", async (req, res) => {
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  if (!title) return res.status(400).json({ error: "Title is required" });
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  task.subtasks.push({ title, completed: false });
  await task.save();
  res.json(present(task));
});

// POST /api/tasks/:id/subtasks/:subId/toggle — flip a checklist item.
router.post("/:id/subtasks/:subId/toggle", async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const sub = task.subtasks.id(req.params.subId);
  if (!sub) return res.status(404).json({ error: "Subtask not found" });
  sub.completed = !sub.completed;
  await task.save();
  res.json(present(task));
});

// DELETE /api/tasks/:id/subtasks/:subId — remove a checklist item.
router.delete("/:id/subtasks/:subId", async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const sub = task.subtasks.id(req.params.subId);
  if (!sub) return res.status(404).json({ error: "Subtask not found" });
  sub.deleteOne();
  await task.save();
  res.json(present(task));
});

// PUT /api/tasks/reorder — bulk update order. Body: { ids: [id, id, ...] }.
router.put("/reorder", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: "ids array required" });
  }
  await Promise.all(
    ids.map((id, i) => Task.findByIdAndUpdate(id, { order: i }))
  );
  res.json({ ok: true });
});

// DELETE /api/tasks/completed — remove all finished one-off tasks.
router.delete("/completed", async (_req, res) => {
  const result = await Task.deleteMany({ type: "oneoff", completed: true });
  res.json({ ok: true, deleted: result.deletedCount });
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

// POST /api/tasks/:id/remind-now — fire an immediate SMS for one task (test).
router.post("/:id/remind-now", async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) return res.status(404).json({ error: "Not found" });
  const settings = await Settings.getGlobal();
  const phone = (settings.phone && settings.phone.trim()) || process.env.REMINDER_PHONE || "";
  const result = await sendSms(phone, `Doozy reminder: ${task.title}`);
  res.json(result);
});

export default router;
