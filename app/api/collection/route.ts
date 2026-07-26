import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";

// Creates a client collection link from a set of listings. Staff only.
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["agent", "admin"].includes(me.role)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  const { listing_ids, show_address } = await req.json();
  if (!Array.isArray(listing_ids) || listing_ids.length === 0) {
    return NextResponse.json({ error: "Pick at least one listing." }, { status: 400 });
  }
  if (listing_ids.length > 30) {
    return NextResponse.json({ error: "Maximum 30 listings per link." }, { status: 400 });
  }

  const admin = supabaseAdmin();

  // private builds can never go to clients
  const { data: allowed } = await admin.from("listings")
    .select("id").in("id", listing_ids).neq("status", "private_build");
  const allowedIds = (allowed ?? []).map(l => l.id);
  if (!allowedIds.length) {
    return NextResponse.json({ error: "None of these can be shared. Private builds are not for sale." }, { status: 400 });
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const { data: col, error } = await admin.from("listing_collections")
    .insert({ token, show_address: show_address === true, created_by: user.id })
    .select("id").single();
  if (error || !col) {
    console.error("collection insert failed", error);
    return NextResponse.json({ error: "Could not create the link." }, { status: 500 });
  }

  const items = allowedIds.map((id: string, i: number) => ({
    collection_id: col.id, listing_id: id, sort_order: i
  }));
  const { error: iErr } = await admin.from("listing_collection_items").insert(items);
  if (iErr) {
    console.error("collection items failed", iErr);
    await admin.from("listing_collections").delete().eq("id", col.id);
    return NextResponse.json({ error: "Could not create the link." }, { status: 500 });
  }

  return NextResponse.json({ token });
}
