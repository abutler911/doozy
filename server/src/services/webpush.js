import webpush from "web-push";
import { PushSubscription } from "../models/PushSubscription.js";

let configured = false;

/** Configure web-push with VAPID details. Safe to call repeatedly. */
export function initWebPush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID keys not set — web push disabled");
    configured = false;
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  configured = true;
  console.log("[push] web push configured");
}

export function isPushConfigured() {
  return configured;
}

/**
 * Send a notification to every stored subscription. Prunes subscriptions the
 * push service reports as gone (404/410). Returns the number delivered.
 */
export async function sendPushToAll(payload) {
  if (!configured) return 0;
  const subs = await PushSubscription.find();
  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          body
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id });
          console.log("[push] pruned expired subscription");
        } else {
          console.warn("[push] send error:", err.statusCode || err.message);
        }
      }
    })
  );
  return sent;
}
