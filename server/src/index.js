import "dotenv/config";
import express from "express";
import cors from "cors";

import { connectDB } from "./db.js";
import { requireAuth } from "./middleware/auth.js";
import { startScheduler } from "./services/scheduler.js";
import tasksRouter from "./routes/tasks.js";
import settingsRouter from "./routes/settings.js";

const app = express();
app.use(express.json());

// CORS — allow the configured frontend origin(s).
const origins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: origins.length ? origins : true,
    credentials: true,
  })
);

// Health check (open, used by Render).
app.get("/api/health", (_req, res) => res.json({ ok: true, app: "doozy" }));

// Login: verify the single app password and hand back the token to store.
app.post("/api/login", (req, res) => {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return res.json({ ok: true, token: "", open: true });
  if (req.body?.password === expected) {
    return res.json({ ok: true, token: expected });
  }
  return res.status(401).json({ error: "Wrong password" });
});

// Everything below requires auth.
app.use("/api/tasks", requireAuth, tasksRouter);
app.use("/api/settings", requireAuth, settingsRouter);

// Centralized error handler.
app.use((err, _req, res, _next) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Server error" });
});

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDB(process.env.MONGODB_URI);
  startScheduler();
  app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
