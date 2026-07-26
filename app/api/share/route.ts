import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";

// Creates (or reuses) a share token for a listing. Staff only.
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["agent", "admin"].includes(me.role)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  const { listing_id } = await req.json();
  if (!listing_id) return NextResponse.json({ error: "Missing listing_id" }, { status: 400 });

  const admin = supabaseAdmin();

  // reuse an existing live link from this user for this listing
  const { data: existing } = await admin.from("listing_shares")
    .select("token")
    .eq("listing_id", listing_id).eq("created_by", user.id).eq("revoked", false)
    .limit(1).maybeSingle();
  if (existing) return NextResponse.json({ token: existing.token });

  const token = crypto.randomUUID().replace(/-/g, "");
  const { error } = await admin.from("listing_shares")
    .insert({ listing_id, token, created_by: user.id });
  if (error) {
    console.error("share insert failed", error);
    return NextResponse.json({ error: "Could not create link" }, { status: 500 });
  }
  return NextResponse.json({ token });
}
