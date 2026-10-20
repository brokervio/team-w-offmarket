import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { normalizePhone, otpEnabled, setBuyerCookie, type WebBuyer } from "@/lib/public";
import { finalizeBuyer } from "@/lib/buyer-signup";
import { sendOtp } from "@/lib/twilio";

const BUDGETS: Record<string, number | null> = {
  "Under $900K": 900000, "$900K to $1.2M": 1200000, "$1.2M to $1.5M": 1500000,
  "$1.5M to $2M": 2000000, "Over $2M": null
};
const TIMELINES = ["Now", "In 3 to 6 months", "In 6 to 12 months", "Just looking"];
const FINANCING = ["Pre-approved", "Working on it", "Not yet", "Paying cash"];
const AREAS = ["Monsey", "Spring Valley", "Airmont", "Suffern", "Anywhere in Rockland"];

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.full_name ?? "").trim().slice(0, 80);
  const phone = normalizePhone(String(b.phone ?? ""));
  const email = String(b.email ?? "").trim().slice(0, 120) || null;
  if (!name) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "Enter a 10-digit cell number." }, { status: 400 });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  if (!b.consent) return NextResponse.json({ error: "Check the box so we can text you." }, { status: 400 });

  const beds = Number(b.beds_min);
  const budgetLabel = Object.keys(BUDGETS).includes(b.budget) ? b.budget : null;
  const row = {
    full_name: name, phone, email,
    beds_min: beds >= 1 && beds <= 12 ? beds : null,
    budget_label: budgetLabel,
    budget_max: budgetLabel ? BUDGETS[budgetLabel] : null,
    timeline: TIMELINES.includes(b.timeline) ? b.timeline : null,
    financing: FINANCING.includes(b.financing) ? b.financing : null,
    area: AREAS.includes(b.area) ? b.area : null,
    tcpa_consent_at: new Date().toISOString(),
    tcpa_ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    utm: typeof b.utm === "object" && b.utm ? b.utm : null,
    last_seen_at: new Date().toISOString()
  };

  const admin = supabaseAdmin();
  const { data: buyer, error } = await admin.from("web_buyers")
    .upsert(row, { onConflict: "phone" }).select("*").single();
  if (error || !buyer) {
    console.error("web_buyers upsert", error);
    return NextResponse.json({ error: "Something broke on our end. Call 845-422-5238." }, { status: 500 });
  }

  if (otpEnabled()) {
    try {
      await sendOtp(phone);
      return NextResponse.json({ step: "code" });
    } catch (e) {
      console.error("sendOtp failed", e);
      return NextResponse.json({ error: "We couldn't text that number. Check it and try again." }, { status: 400 });
    }
  }

  const { token, matches } = await finalizeBuyer(buyer as WebBuyer, false);
  const res = NextResponse.json({ step: "done", matches, first: name.split(" ")[0] });
  setBuyerCookie(res, token);
  return res;
}
