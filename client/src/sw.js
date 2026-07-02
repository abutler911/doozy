/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { readToken } from "./lib/tokenStore.js";

// Same base the app uses: dev goes through the Vite proxy, production hits
// the Render API origin baked in at build time.
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

// Precache the app shell (list injected at build time by vite-plugin-pwa).
precacheAndRoute(self.__WB_MANIFEST);

// API: network-first so data is fresh online but the app still works offline.
registerRoute(
  ({ url }) => url.pathname.startsWith("/api"),
  new NetworkFirst({
    cacheName: "doozy-api",
    networkTimeoutSeconds: 5,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

// Activate updated SW immediately.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// --- Web Push ---
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data && event.data.text() };
  }
  const title = data.title || "Doozy";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: data.tag || "doozy",
      // Task reminders carry action buttons (where the platform supports
      // them); other pushes (summary, nudges) are plain.
      actions: Array.isArray(data.actions) ? data.actions : [],
      data: { url: data.url || "/", taskId: data.taskId || null },
    })
  );
});

/** Authenticated call to the API from the worker (token mirrored in IDB). */
async function taskAction(taskId, path, body) {
  const token = await readToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api/tasks/${taskId}/${path}`, {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
}

/** Brief confirmation so tapping an action doesn't feel like a dead button. */
function confirmNote(title) {
  return self.registration.showNotification(title, {
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: "doozy-confirm",
    silent: true,
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { taskId, url } = event.notification.data || {};

  if (event.action === "done" && taskId) {
    event.waitUntil(
      taskAction(taskId, "complete")
        .then(() => confirmNote("Done ✓"))
        .catch(() => confirmNote("Couldn't mark it done — open Doozy"))
    );
    return;
  }
  if (event.action === "snooze" && taskId) {
    event.waitUntil(
      taskAction(taskId, "snooze", { minutes: 30 })
        .then(() => confirmNote("Snoozed for 30 minutes"))
        .catch(() => confirmNote("Couldn't snooze — open Doozy"))
    );
    return;
  }

  // Default click: focus an open window or open a new one.
  const target = url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
