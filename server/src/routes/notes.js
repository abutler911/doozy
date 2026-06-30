import { Router } from "express";
import { Note, NOTE_COLORS } from "../models/Note.js";

const router = Router();

/** Coerce an incoming color to a known key, falling back to "default". */
function sanitizeColor(color) {
  return NOTE_COLORS.includes(color) ? color : "default";
}

// GET /api/notes — every note (board + archive). Pinned float to the top,
// then manual order, then most-recently updated.
router.get("/", async (_req, res) => {
  const notes = await Note.find().sort({ pinned: -1, order: 1, updatedAt: -1 });
  res.json(notes);
});

// POST /api/notes — create. A note needs a title or a body (Keep ignores
// fully-empty notes; we do the same).
router.post("/", async (req, res) => {
  const { title, body, color, pinned } = req.body;
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const cleanBody = typeof body === "string" ? body : "";
  if (!cleanTitle && !cleanBody.trim()) {
    return res.status(400).json({ error: "An empty note can't be saved" });
  }
  // New notes go to the top of the board.
  const min = await Note.findOne().sort({ order: 1 }).select("order");
  const order = (min?.order ?? 0) - 1;

  const note = await Note.create({
    title: cleanTitle,
    body: cleanBody,
    color: sanitizeColor(color),
    pinned: !!pinned,
    order,
  });
  res.status(201).json(note);
});

// PATCH /api/notes/:id — update arbitrary fields (title, body, color, pin,
// archive, order).
router.patch("/:id", async (req, res) => {
  const allowed = ["title", "body", "color", "pinned", "archived", "order"];
  const updates = {};
  for (const key of allowed) {
    if (key in req.body) updates[key] = req.body[key];
  }
  if ("color" in updates) updates.color = sanitizeColor(updates.color);
  if ("title" in updates && typeof updates.title === "string") {
    updates.title = updates.title.trim();
  }
  // Pinning a note implies un-archiving it (you can't pin from the archive),
  // matching Keep's behavior.
  if (updates.pinned === true) updates.archived = false;

  const note = await Note.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!note) return res.status(404).json({ error: "Not found" });
  res.json(note);
});

// PUT /api/notes/reorder — bulk reorder. Body: { ids: [id, id, ...] }.
router.put("/reorder", async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: "ids array required" });
  }
  await Promise.all(ids.map((id, i) => Note.findByIdAndUpdate(id, { order: i })));
  res.json({ ok: true });
});

// DELETE /api/notes/:id
router.delete("/:id", async (req, res) => {
  const note = await Note.findByIdAndDelete(req.params.id);
  if (!note) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});

export default router;
