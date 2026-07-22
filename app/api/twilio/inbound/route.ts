import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  const form = await req.formData();
  const from = String(form.get("From") ?? "");
  const body = String(form.get("Body") ?? "").trim().toUpperCase();
  const admin = supabaseAdmin();
  if (["STOP","STOPALL","UNSUBSCRIBE","CANCEL","END","QUIT"].includes(body)) {
    await admin.from("profiles").update({ sms_opt_out: true }).eq("phone", from);
  } else if (["START","YES","UNSTOP"].includes(body)) {
    await admin.from("profiles").update({ sms_opt_out: false }).eq("phone", from);
  }
  return new NextResponse("<Response></Response>", { headers: { "Content-Type": "text/xml" } });
}
