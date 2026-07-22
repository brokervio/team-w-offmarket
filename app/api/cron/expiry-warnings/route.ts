import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { sendSms } from "@/lib/twilio";
import { fireGhl } from "@/lib/ghl";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const now = Date.now();
  const windows = [
    { days: 3, msg: "Your Team W off-market access expires in 3 days. Speak with an agent to extend 4 more weeks: 845-422-5238" },
    { days: 1, msg: "Last day of access. One call keeps your off-market search alive: 845-422-5238" }
  ];

  let sent = 0;
  for (const w of windows) {
    const from = new Date(now + (w.days - 0.5) * 86400000).toISOString();
    const to = new Date(now + (w.days + 0.5) * 86400000).toISOString();
    const { data: users } = await admin.from("profiles")
      .select("id, full_name, phone, sms_opt_out")
      .eq("role", "prospect")
      .gte("access_expires_at", from).lt("access_expires_at", to);
    for (const u of users ?? []) {
      if (u.phone && !u.sms_opt_out) { await sendSms(u.phone, w.msg).catch(() => {}); sent++; }
      fireGhl("expiry", { name: u.full_name, phone: u.phone, days_left: w.days, tag: "offmarket-expiring" });
    }
  }
  return NextResponse.json({ ok: true, sent });
}
