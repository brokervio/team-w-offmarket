import { NextResponse } from "next/server";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";

// Photos are uploaded through the server so the private storage buckets
// never need public policies. Staff only.
async function requireStaff() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return p && ["agent", "admin"].includes(p.role) ? user : null;
}

export async function POST(req: Request) {
  const user = await requireStaff();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const listingId = form.get("listing_id") as string | null;
  const sortOrder = Number(form.get("sort_order") ?? 0);
  const kind = (form.get("kind") as string | null) ?? "photo";
  if (!file || !listingId) {
    return NextResponse.json({ error: "Missing file or listing_id" }, { status: 400 });
  }

  // "photo" goes to the public bucket (shareable with clients).
  // "file" (floor plans, docs) goes to the INTERNAL bucket: agents only,
  // never rendered on any client-facing page.
  let bucket = "listing-media-public";
  let mediaType = "photo";
  let visibility = "public";
  if (kind === "file") {
    const okTypes = ["application/pdf", "image/", "application/msword",
      "application/vnd.openxmlformats-officedocument", "application/vnd.ms-excel", "text/plain"];
    if (!okTypes.some(t => file.type.startsWith(t))) {
      return NextResponse.json({ error: "That file type is not supported. PDF, Word, Excel, or images work." }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Keep files under 8 MB. For bigger files, use the Link to more photos field." }, { status: 400 });
    }
    bucket = "listing-media-internal";
    mediaType = "doc";
    visibility = "internal";
  } else if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${listingId}/${crypto.randomUUID()}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const up = await admin.storage.from(bucket)
    .upload(path, buf, { contentType: file.type || "application/octet-stream" });
  if (up.error) {
    console.error("storage upload failed", up.error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const ins = await admin.from("listing_media").insert({
    listing_id: listingId,
    storage_path: path,
    media_type: mediaType,
    visibility,
    sort_order: sortOrder
  });
  if (ins.error) {
    console.error("listing_media insert failed", ins.error);
    return NextResponse.json({ error: "Could not record photo" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await requireStaff();
  if (!user) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const { media_id } = await req.json();
  if (!media_id) return NextResponse.json({ error: "Missing media_id" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: row } = await admin.from("listing_media")
    .select("id, storage_path, visibility").eq("id", media_id).single();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bucket = row.visibility === "internal" ? "listing-media-internal" : "listing-media-public";
  await admin.storage.from(bucket).remove([row.storage_path]);
  await admin.from("listing_media").delete().eq("id", media_id);

  return NextResponse.json({ ok: true });
}
