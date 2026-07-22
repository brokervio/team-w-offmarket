type GhlEvent = "signup" | "lead" | "expiry";

const urls: Record<GhlEvent, string | undefined> = {
  signup: process.env.GHL_WEBHOOK_SIGNUP_URL,
  lead: process.env.GHL_WEBHOOK_LEAD_URL,
  expiry: process.env.GHL_WEBHOOK_EXPIRY_URL
};

export async function fireGhl(event: GhlEvent, payload: Record<string, unknown>) {
  const url = urls[event];
  if (!url || url.includes("xxxx")) return; // not configured yet, fail quietly
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, ...payload, ts: new Date().toISOString() })
    });
  } catch (e) {
    console.error("GHL webhook failed", event, e);
  }
}
