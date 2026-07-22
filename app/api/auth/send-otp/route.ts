import { NextResponse } from "next/server";
import { sendOtp } from "@/lib/twilio";

export async function POST(req: Request) {
  const { phone } = await req.json();
  if (!phone || !/^\+\d{10,15}$/.test(phone)) {
    return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  }
  try {
    await sendOtp(phone);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("send-otp failed", e);
    return NextResponse.json({ error: "Could not send code" }, { status: 500 });
  }
}
