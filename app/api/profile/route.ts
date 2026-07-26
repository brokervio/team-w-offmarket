import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";

// Staff update their own profile: name, phone, contact email, photo.
// Runs through the service role so only these fields can ever change
// (role and access are untouchable from here).
export async function POST(req: Request) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || !["agent", "admin"].includes(me.role)) {
    return NextResponse.json({ error: "Staff only" }, { status: 403 });
  }

  const form = await req.formData();
  const full_name = (form.get("full_name") as string | null)?.trim();
  const phone = (form.get("phone") as string | null)?.trim();
  const contact_email = (form.get("contact_email") as string | null)?.trim();
  const file = form.get("photo") as File | null;

  const admin = supabaseAdmin();
  const updates: Record<string, any> = {};
  if (full_name) updates.full_name = full_name;
  if (phone !== null && phone !== undefined) updates.phone = phone;
  if (contact_email !== null && contact_email !== undefined) updates.contact_email = contact_email;

  if (file && file.size > 0) {
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "The photo must be an image file." }, { status: 400 });
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `avatars/${user.id}/${crypto.randomUUID()}-${safeName}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const up = await admin.storage.from("listing-media-public")
      .upload(path, buf, { contentType: file.type });
    if (up.error) {
      console.error("avatar upload failed", up.error);
      return NextResponse.json({ error: "Photo upload failed." }, { status: 500 });
    }
    updates.avatar_path = path;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  }

  const { error } = await admin.from("profiles").update(updates).eq("id", user.id);
  if (error) {
    console.error("profile update failed", error);
    return NextResponse.json({ error: "Could not save your profile." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
