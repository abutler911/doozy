import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import { ToastProvider } from "./components/Toast.jsx";
import "./index.css";

// Keep installed PWAs fresh. The browser only checks for a new service
// worker on navigation — and a home-screen app that resumes from memory may
// not navigate for days — so we also check whenever the app becomes visible
// and on a slow interval. With registerType "autoUpdate" the new worker
// takes over (skipWaiting + clientsClaim in sw.js) and the page reloads to
// pick up the new precached shell.
const CHECK_EVERY_MS = 60 * 60 * 1000;
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const check = () => {
      if (navigator.onLine !== false) registration.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") check();
    });
    setInterval(check, CHECK_EVERY_MS);
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
