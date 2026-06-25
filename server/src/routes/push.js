import { Router } from "express";
import { PushSubscription } from "../models/PushSubscription.js";
import { isPushConfigured, sendPushToAll } from "../services/webpush.js";

const router = Router();

// GET /api/push/public-key — the VAPID public key the client subscribes with.
router.get("/public-key", (_req, res) => {
  res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    configured: isPushConfigured(),
  });
});

// POST /api/push/subscribe — store a browser PushSubscription (upsert).
router.post("/subscribe", async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ error: "Invalid subscription" });
  }
  await PushSubscription.updateOne(
    { endpoint },
    { $set: { endpoint, keys } },
    { upsert: true }
  );
  res.json({ ok: true });
});

// POST /api/push/unsubscribe — remove a subscription by endpoint.
router.post("/unsubscribe", async (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) await PushSubscription.deleteOne({ endpoint });
  res.json({ ok: true });
});

// POST /api/push/test — fire a test push to all devices.
router.post("/test", async (_req, res) => {
  const sent = await sendPushToAll({
    title: "Doozy",
    body: "Push notifications are working. 🎉",
    url: "/",
  });
  res.json({ ok: true, sent });
});

export default router;
