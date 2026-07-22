import { NextResponse } from "next/server";
import { checkOtp, sendSms } from "@/lib/twilio";
import { supabaseAdmin } from "@/lib/supabase-server";
import { fireGhl } from "@/lib/ghl";

export async function POST(req: Request) {
  const { phone, code, email, password, full_name } = await req.json();
  if (!phone || !code || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const approved = await checkOtp(phone, code);
  if (!approved) return NextResponse.json({ error: "Bad code" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, phone, tcpa_consent: "true" }
  });
  if (error) {
    console.error("createUser failed", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // stamp phone verification + consent IP
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "";
  await admin.from("profiles").update({
    phone_verified_at: new Date().toISOString(),
    tcpa_consent_ip: ip
  }).eq("id", data.user.id);

  // welcome SMS + GHL
  const link = process.env.NEXT_PUBLIC_APP_URL + "/browse";
  sendSms(phone, `Welcome to Team W Off-Market. You have 14 days of full access to inventory you won't find anywhere else. Browse now: ${link}`).catch(() => {});
  fireGhl("signup", { name: full_name, email, phone, tag: "offmarket-signup" });

  return NextResponse.json({ ok: true });
}
