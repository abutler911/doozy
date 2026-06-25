/**
 * Textbelt SMS sender. Uses the paid API key from env (TEXTBELT_KEY).
 * Docs: https://docs.textbelt.com/
 *
 * Returns { success: boolean, ... } and never throws on a normal API error,
 * so the scheduler can keep running.
 */
export async function sendSms(phone, message) {
  const key = process.env.TEXTBELT_KEY;
  if (!key) {
    console.warn("[sms] TEXTBELT_KEY not set — skipping send");
    return { success: false, error: "TEXTBELT_KEY not configured" };
  }
  if (!phone) {
    return { success: false, error: "No phone number configured" };
  }

  try {
    const res = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, message, key }),
    });
    const data = await res.json();
    if (!data.success) {
      console.warn("[sms] send failed:", data.error || data);
    } else {
      console.log(`[sms] sent to ${phone} (quota left: ${data.quotaRemaining})`);
    }
    return data;
  } catch (err) {
    console.error("[sms] network error:", err.message);
    return { success: false, error: err.message };
  }
}
