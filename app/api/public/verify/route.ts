import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { normalizePhone, setBuyerCookie, type WebBuyer } from "@/lib/public";
import { finalizeBuyer } from "@/lib/buyer-signup";
import { checkOtp } from "@/lib/twilio";

export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(b.phone ?? ""));
  const code = String(b.code ?? "").replace(/\D/g, "");
  if (!phone || code.length < 4) return NextResponse.json({ error: "Enter the code we texted you." }, { status: 400 });

  let ok = false;
  try { ok = await checkOtp(phone, code); } catch (e) { console.error("checkOtp", e); }
  if (!ok) return NextResponse.json({ error: "That code didn't match. Try again or resend it." }, { status: 400 });

  const { data: buyer } = await supabaseAdmin().from("web_buyers").select("*").eq("phone", phone).single();
  if (!buyer) return NextResponse.json({ error: "Start again from the form." }, { status: 400 });

  const { token, matches } = await finalizeBuyer(buyer as WebBuyer, true);
  const res = NextResponse.json({ step: "done", matches, first: buyer.full_name.split(" ")[0] });
  setBuyerCookie(res, token);
  return res;
}
