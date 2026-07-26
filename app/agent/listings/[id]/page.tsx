import Header from "@/components/Header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import ListingForm, { type ExistingPhoto } from "@/components/ListingForm";

export const dynamic = "force-dynamic";

export default async function EditListing({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: listing } = await supabase.from("listings").select("*").eq("id", params.id).single();
  if (!listing) notFound();

  const { data: media } = await supabase.from("listing_media")
    .select("id, storage_path, visibility")
    .eq("listing_id", params.id).eq("media_type", "photo")
    .order("sort_order");

  const admin = supabaseAdmin();
  const photos: ExistingPhoto[] = [];
  for (const m of media ?? []) {
    const bucket = m.visibility === "internal" ? "listing-media-internal" : "listing-media-public";
    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(m.storage_path, 3600);
    if (signed) photos.push({ id: m.id, url: signed.signedUrl });
  }

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/agent/listings" className="text-sm text-teal font-semibold">&larr; Back to listings</Link>
        <h1 className="text-2xl mt-2">Edit Listing</h1>
        <ListingForm listingId={params.id} initial={listing} existingPhotos={photos} />
      </main>
    </>
  );
}
