import { api } from "./api.js";

/** Web Push is only usable where the SW + PushManager + Notification exist. */
export function pushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Ask permission, subscribe via the active service worker, and register the
 * subscription with the server. Returns true on success.
 */
export async function enablePush() {
  if (!pushSupported()) throw new Error("Push isn't supported on this device.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission denied.");

  const { publicKey, configured } = await api.pushPublicKey();
  if (!configured || !publicKey) {
    throw new Error("Server push isn't configured (missing VAPID keys).");
  }

  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  const sub =
    existing ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await api.pushSubscribe(sub.toJSON());
  return true;
}

/** Unsubscribe locally and tell the server to drop it. */
export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await api.pushUnsubscribe(sub.endpoint).catch(() => {});
    await sub.unsubscribe().catch(() => {});
  }
}
