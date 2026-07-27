import Header from "@/components/Header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import ListingForm, { type ExistingPhoto, type ExistingDoc, type TeamMember } from "@/components/ListingForm";
import { Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditListing({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: listing } = await supabase.from("listings").select("*").eq("id", params.id).single();
  if (!listing) notFound();

  const { data: me } = await supabase.from("profiles")
    .select("role").eq("id", user!.id).single();
  const canEdit = me?.role === "admin" || listing.created_by === user!.id;

  if (!canEdit) {
    return (
      <>
        <Header />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <Link href="/agent/listings" className="text-sm text-teal font-semibold">&larr; Back to listings</Link>
          <div className="mt-6 card p-8 text-center">
            <Lock size={28} className="mx-auto text-navy" />
            <h1 className="text-xl mt-3">This is not your listing</h1>
            <p className="text-sm text-slate-500 mt-2">
              Only the agent who added a listing can edit it. Admins can edit everything.
              Ask an admin if something here needs to change.
            </p>
          </div>
        </main>
      </>
    );
  }

  const { data: team } = await supabase.from("profiles")
    .select("id, full_name").in("role", ["agent", "admin"]).order("full_name");

  const { data: media } = await supabase.from("listing_media")
    .select("id, storage_path, visibility, media_type")
    .eq("listing_id", params.id)
    .order("sort_order");

  const admin = supabaseAdmin();
  const photos: ExistingPhoto[] = [];
  const docs: ExistingDoc[] = [];
  for (const m of media ?? []) {
    const bucket = m.visibility === "internal" ? "listing-media-internal" : "listing-media-public";
    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(m.storage_path, 3600);
    if (!signed) continue;
    if (m.media_type === "photo") {
      photos.push({ id: m.id, url: signed.signedUrl });
    } else {
      const raw = m.storage_path.split("/").pop() ?? "file";
      docs.push({ id: m.id, url: signed.signedUrl, name: raw.length > 37 ? raw.slice(37) : raw });
    }
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/agent/listings" className="text-sm text-teal font-semibold">&larr; Back to listings</Link>
        <h1 className="text-2xl mt-2">Edit Listing</h1>
        <ListingForm listingId={params.id} initial={listing} existingPhotos={photos} existingDocs={docs}
                     team={(team ?? []) as TeamMember[]} currentUserId={user!.id}
                     isAdmin={me?.role === "admin"} aiEnabled={!!process.env.ANTHROPIC_API_KEY} />
      </main>
    </>
  );
}
