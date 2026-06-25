import { Router } from "express";
import { Settings } from "../models/Settings.js";
import { sendSms } from "../services/textbelt.js";

const router = Router();

// GET /api/settings
router.get("/", async (_req, res) => {
  const settings = await Settings.getGlobal();
  res.json({
    phone: settings.phone,
    dailySummaryEnabled: settings.dailySummaryEnabled,
    dailySummaryTime: settings.dailySummaryTime,
    smsConfigured: !!process.env.TEXTBELT_KEY,
    envPhone: process.env.REMINDER_PHONE || "",
  });
});

// PUT /api/settings
router.put("/", async (req, res) => {
  const settings = await Settings.getGlobal();
  const { phone, dailySummaryEnabled, dailySummaryTime } = req.body;
  if (phone !== undefined) settings.phone = phone;
  if (dailySummaryEnabled !== undefined)
    settings.dailySummaryEnabled = !!dailySummaryEnabled;
  if (dailySummaryTime !== undefined) settings.dailySummaryTime = dailySummaryTime;
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
