import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { sendSms } from "@/lib/twilio";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { user_id } = await req.json();
  const days = Number(process.env.ACCESS_EXTENSION_DAYS ?? 28);

  // RPC enforces staff check + writes the audit row
  const { data: newExpiry, error } = await supabase.rpc("extend_access", { target_user: user_id, days });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });

  const admin = supabaseAdmin();
  const [{ data: prospect }, { data: agent }] = await Promise.all([
    admin.from("profiles").select("phone, sms_opt_out").eq("id", user_id).single(),
    admin.from("profiles").select("full_name").eq("id", user.id).single()
  ]);
  const first = (agent?.full_name ?? "your agent").split(" ")[0];
  const link = process.env.NEXT_PUBLIC_APP_URL + "/browse";
  if (prospect?.phone && !prospect.sms_opt_out) {
    sendSms(prospect.phone, `Good news, your Team W off-market access has been extended 4 weeks by ${first}. Keep searching: ${link}`).catch(() => {});
  }
  return NextResponse.json({ ok: true, newExpiry });
}
