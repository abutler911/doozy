import { Router } from "express";
import { Settings } from "../models/Settings.js";
import { sendSms } from "../services/textbelt.js";
import { isPushConfigured } from "../services/webpush.js";

const router = Router();

// GET /api/settings
router.get("/", async (_req, res) => {
  const settings = await Settings.getGlobal();
  res.json({
    phone: settings.phone,
    dailySummaryEnabled: settings.dailySummaryEnabled,
    dailySummaryTime: settings.dailySummaryTime,
    streakNudgeEnabled: settings.streakNudgeEnabled,
    streakNudgeTime: settings.streakNudgeTime,
    pushEnabled: settings.pushEnabled,
    smsConfigured: !!process.env.TEXTBELT_KEY,
    pushConfigured: isPushConfigured(),
    envPhone: process.env.REMINDER_PHONE || "",
  });
});

// PUT /api/settings
router.put("/", async (req, res) => {
  const settings = await Settings.getGlobal();
  const {
    phone,
    dailySummaryEnabled,
    dailySummaryTime,
    streakNudgeEnabled,
    streakNudgeTime,
    pushEnabled,
  } = req.body;
  if (phone !== undefined) settings.phone = phone;
  if (dailySummaryEnabled !== undefined)
    settings.dailySummaryEnabled = !!dailySummaryEnabled;
  if (dailySummaryTime !== undefined) settings.dailySummaryTime = dailySummaryTime;
  if (streakNudgeEnabled !== undefined)
    settings.streakNudgeEnabled = !!streakNudgeEnabled;
  if (streakNudgeTime !== undefined) settings.streakNudgeTime = streakNudgeTime;
  if (pushEnabled !== undefined) settings.pushEnabled = !!pushEnabled;
  await settings.save();
  res.json({ ok: true });
});

// POST /api/settings/test-sms — send a test text to verify config.
router.post("/test-sms", async (_req, res) => {
  const settings = await Settings.getGlobal();
  const phone =
    (settings.phone && settings.phone.trim()) || process.env.REMINDER_PHONE || "";
  const result = await sendSms(phone, "Doozy: SMS reminders are working. 🎉");
  res.json(result);
});

export default router;
