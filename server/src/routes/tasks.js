import { Router } from "express";
import { Task } from "../models/Task.js";
import { Settings } from "../models/Settings.js";
import { sendSms } from "../services/textbelt.js";
import { todayStr } from "../services/time.js";

const router = Router();

/** Shape a task for the client, adding a `doneToday` convenience flag. */
function present(task) {
  const today = todayStr();
  const obj = task.toObject ? task.toObject() : task;
  const doneToday =
    obj.type === "daily" ? obj.completedDates.includes(today) : obj.completed;
  return { ...obj, doneToday };
}

// GET /api/tasks — all tasks, sorted by priority then manual order.
router.get("/", async (_req, res) => {
  const tasks = await Task.find().sort({ priority: -1, order: 1, createdAt: 1 });
  res.json(tasks.map(present));
});

// POST /api/tasks — create.
router.post("/", async (req, res) => {
  const { title, notes, type, priority, dueDate, reminderTime, reminderEnabled } =
    req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required" });
  }
  // Put new tasks at the top of their priority bucket.
  const min = await Task.findOne().sort({ order: 1 }).select("order");
  const order = (min?.order ?? 0) - 1;

  const task = await Task.create({
    title: title.trim(),
    notes: notes || "",
    type: type === "daily" ? "daily" : "oneoff",
    priority: [1, 2, 3, 4].includes(priority) ? priority : 2,
    dueDate: dueDate || null,
    reminderTime: reminderTime || null,
    reminderEnabled: !!reminderEnabled,
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
  ];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
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
  } else {
    task.completed = !task.completed;
  }
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
