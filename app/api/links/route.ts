import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";

// Revoke (or un-revoke) a client link. Owner or admin only.
export async function PATCH(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["agent", "admin"].includes(me.role)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  const { kind, id, revoked } = await req.json();
  if (!id || !["share", "collection"].includes(kind)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const table = kind === "share" ? "listing_shares" : "listing_collections";

  const admin = supabaseAdmin();
  const { data: row } = await admin.from(table).select("created_by").eq("id", id).single();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (me.role !== "admin" && row.created_by !== user.id) {
    return NextResponse.json({ error: "You can only manage your own links." }, { status: 403 });
  }

  const { error } = await admin.from(table).update({ revoked: revoked !== false }).eq("id", id);
  if (error) return NextResponse.json({ error: "Could not update the link." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
