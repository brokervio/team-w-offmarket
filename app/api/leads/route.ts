import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { sendSms } from "@/lib/twilio";
import { fireGhl } from "@/lib/ghl";

export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { listing_id = null, lead_type } = await req.json();
  if (!["details_request","plan_request","reactivation"].includes(lead_type)) {
    return NextResponse.json({ error: "Bad lead type" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: lead, error } = await admin.from("leads")
    .insert({ user_id: user.id, listing_id, lead_type })
    .select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profile } = await admin.from("profiles")
    .select("full_name, phone, email:id").eq("id", user.id).single();
  let listingName = "the platform";
  if (listing_id) {
    const { data: l } = await admin.from("listings").select("public_name").eq("id", listing_id).single();
    if (l) listingName = l.public_name;
  }

  // notify all agents+admins with a phone on file (round-robin can come in Phase 2)
  const { data: staff } = await admin.from("profiles")
    .select("phone").in("role", ["agent","admin"]).not("phone","is",null);
  const intel = process.env.NEXT_PUBLIC_APP_URL + "/agent/prospects/" + user.id;
  const msg = `New ${lead_type.replace("_"," ")} from ${profile?.full_name ?? "a prospect"} on ${listingName}. Intel: ${intel}`;
  for (const s of staff ?? []) {
    if (s.phone) sendSms(s.phone, msg).catch(() => {});
  }

  fireGhl("lead", {
    name: profile?.full_name, phone: profile?.phone,
    lead_type, listing: listingName, tag: "offmarket-lead"
  });

  return NextResponse.json({ ok: true, id: lead.id });
}
