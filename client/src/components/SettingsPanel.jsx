import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "./Toast.jsx";
import { enablePush, disablePush, pushSupported } from "../lib/push.js";

export default function SettingsPanel({ onClose }) {
  const toast = useToast();
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => setStatus("Failed to load."));
  }, []);

  function set(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    await api.updateSettings({
      phone: settings.phone,
      dailySummaryEnabled: settings.dailySummaryEnabled,
      dailySummaryTime: settings.dailySummaryTime,
    });
    setStatus("Saved.");
    setTimeout(() => setStatus(""), 1500);
  }

  async function test() {
    setStatus("Sending…");
    const res = await api.testSms();
    setStatus(res.success ? "Test text sent ✓" : `Failed: ${res.error || "unknown"}`);
  }

  async function togglePush(on) {
    setBusy(true);
    try {
      if (on) {
        await enablePush();
        await api.updateSettings({ pushEnabled: true });
        set("pushEnabled", true);
        toast.success("Push enabled on this device.");
      } else {
        await disablePush();
        await api.updateSettings({ pushEnabled: false });
        set("pushEnabled", false);
        toast.success("Push disabled.");
      }
    } catch (err) {
      toast.error(err.message || "Couldn't change push settings.");
    } finally {
      setBusy(false);
    }
  }

  async function testPush() {
    const res = await api.testPush();
    if (res.sent > 0) toast.success(`Test push sent to ${res.sent} device(s).`);
    else toast.error("No devices got it — enable push on this device first.");
  }

  if (!settings) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="field">
          <label>Reminder phone number</label>
          <input
            type="tel"
            placeholder={settings.envPhone || "+15551234567"}
            value={settings.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <small>
            Leave blank to use the server default
            {settings.envPhone ? ` (${settings.envPhone})` : ""}.
          </small>
        </div>

        <div className="field">
          <label className="row-label">
            <input
              type="checkbox"
              checked={settings.dailySummaryEnabled}
              onChange={(e) => set("dailySummaryEnabled", e.target.checked)}
            />
            Send me a morning summary
          </label>
          {settings.dailySummaryEnabled && (
            <input
              type="time"
              value={settings.dailySummaryTime}
              onChange={(e) => set("dailySummaryTime", e.target.value)}
            />
          )}
        </div>

        <div className="sms-status">
          {settings.smsConfigured ? (
            <span className="ok">● SMS configured</span>
          ) : (
            <span className="warn">● TEXTBELT_KEY not set on server</span>
          )}
        </div>

        {/* --- Push notifications --- */}
        <div className="field push-field">
          <label>Push notifications</label>
          {!pushSupported() ? (
            <small>This device/browser doesn't support web push.</small>
          ) : !settings.pushConfigured ? (
            <small className="warn-text">
              Server push isn't configured (no VAPID keys).
            </small>
          ) : (
            <>
              <label className="row-label">
                <input
                  type="checkbox"
                  checked={!!settings.pushEnabled}
                  disabled={busy}
                  onChange={(e) => togglePush(e.target.checked)}
                />
                Send reminders as push on this device (free)
              </label>
              {settings.pushEnabled && (
                <button className="btn btn-sm" onClick={testPush}>
                  Send test push
                </button>
              )}
            </>
          )}
        </div>

        {status && <div className="modal-status">{status}</div>}

        <div className="modal-actions">
          <button className="btn" onClick={test} disabled={!settings.smsConfigured}>
            Send test text
          </button>
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
