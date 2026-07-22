import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { fireGhl } from "@/lib/ghl";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = supabaseAdmin();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const { data: expired } = await admin.from("profiles")
    .select("id, full_name, phone")
    .eq("role", "prospect")
    .gte("access_expires_at", hourAgo)
    .lt("access_expires_at", new Date().toISOString());
  for (const u of expired ?? []) {
    fireGhl("expiry", { name: u.full_name, phone: u.phone, days_left: 0, tag: "offmarket-expired" });
  }
  return NextResponse.json({ ok: true, expired: expired?.length ?? 0 });
}
