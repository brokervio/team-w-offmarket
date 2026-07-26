import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { formatPrice, STATUS_LABEL, TYPE_LABEL } from "@/lib/access";
import { BedDouble, Bath, Ruler, MapPin, Pencil, Lock, Camera, CalendarDays, UserCheck, ExternalLink } from "lucide-react";
import ShareActions from "@/components/ShareActions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  pending: "bg-amber-100 text-amber-800",
  coming_soon: "bg-teal-light text-teal border border-teal",
  available: "bg-teal text-white",
  in_contract: "bg-navy text-white",
  sold: "bg-slate-700 text-white",
  archived: "bg-slate-200 text-slate-600"
};

export default async function ListingDetail({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: l } = await supabase.from("listings")
    .select("*, builders:builder_id(name, contact_name, contact_phone), listing_agent:listing_agent_id(full_name)")
    .eq("id", params.id).single();
  if (!l) notFound();

  const { data: me } = await supabase.from("profiles")
    .select("role").eq("id", user!.id).single();
  const canEdit = me?.role === "admin" || l.created_by === user!.id;

  const { data: media } = await supabase.from("listing_media")
    .select("id, storage_path, visibility")
    .eq("listing_id", params.id).eq("media_type", "photo")
    .order("sort_order");

  const admin = supabaseAdmin();
  const photos: string[] = [];
  for (const m of media ?? []) {
    const bucket = m.visibility === "internal" ? "listing-media-internal" : "listing-media-public";
    const { data: signed } = await admin.storage.from(bucket).createSignedUrl(m.storage_path, 3600);
    if (signed) photos.push(signed.signedUrl);
  }

  const builder = l.builders as { name: string; contact_name: string | null; contact_phone: string | null } | null;
  const listingAgent = l.listing_agent as { full_name: string | null } | null;

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Link href="/browse" className="text-sm text-teal font-semibold">&larr; Back to inventory</Link>

        {/* GALLERY */}
        <div className="mt-4">
          {photos.length === 0 ? (
            <div className="aspect-[3/1] card flex flex-col items-center justify-center gap-2 text-slate-400">
              <Camera size={36} />
              <p className="text-sm font-semibold">No photos yet. Add some from Edit Listing.</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 grid-rows-2 gap-2 rounded-card overflow-hidden max-h-[420px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photos[0]} alt="Main photo"
                   className={"w-full h-full object-cover " + (photos.length > 1 ? "col-span-2 row-span-2" : "col-span-4 row-span-2")} />
              {photos.slice(1, 5).map((p, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={p} alt={"Photo " + (i + 2)} className="w-full h-full object-cover" />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          {/* MAIN COLUMN */}
          <div className="lg:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-3xl font-extrabold text-navy">{formatPrice(l)}</p>
                <p className="mt-1 text-lg font-semibold text-navy flex items-center gap-1.5">
                  <MapPin size={18} className="text-teal" /> {l.exact_address || l.public_name}
                </p>
                <p className="text-sm text-slate-500 mt-0.5">{l.town}{l.neighborhood_label ? ", " + l.neighborhood_label : ""}</p>
              </div>
              <span className={"badge shrink-0 " + (STATUS_STYLE[l.status] ?? "badge-gray")}>
                {STATUS_LABEL[l.status] ?? l.status}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-5 text-navy font-semibold border-y border-slate-100 py-4">
              {l.beds ? <span className="flex items-center gap-1.5"><BedDouble size={18} className="text-teal"/>{l.beds} beds</span> : null}
              {l.baths ? <span className="flex items-center gap-1.5"><Bath size={18} className="text-teal"/>{l.baths} baths</span> : null}
              {l.sqft ? <span className="flex items-center gap-1.5"><Ruler size={18} className="text-teal"/>{l.sqft.toLocaleString()} sqft</span> : null}
              <span className="text-sm text-slate-500 font-normal">{TYPE_LABEL[l.property_type] ?? l.property_type}</span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {l.delivery_date && (
                <div className="card p-3">
                  <p className="text-xs text-slate-500 flex items-center gap-1"><CalendarDays size={13}/> Delivery</p>
                  <p className="font-semibold text-navy mt-0.5">{new Date(l.delivery_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</p>
                </div>
              )}
              {l.lot_desc && (
                <div className="card p-3">
                  <p className="text-xs text-slate-500">Lot</p>
                  <p className="font-semibold text-navy mt-0.5">{l.lot_desc}</p>
                </div>
              )}
              <div className="card p-3">
                <p className="text-xs text-slate-500">Added</p>
                <p className="font-semibold text-navy mt-0.5">{new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
              </div>
            </div>

            {l.description_public && (
              <section className="mt-6">
                <h2 className="text-lg">About this property</h2>
                <p className="mt-2 text-slate-600 whitespace-pre-line leading-relaxed">{l.description_public}</p>
              </section>
            )}
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-4">
            {canEdit && (
              <Link href={"/agent/listings/" + l.id} className="btn-primary w-full">
                <Pencil size={16} /> Edit Listing
              </Link>
            )}

            <ShareActions listingId={l.id} addressLine={l.exact_address || l.public_name}
                          publicName={l.public_name} town={l.town} />

            {/* REPRESENTATION */}
            <div className="card p-5">
              <p className="text-xs font-bold text-teal flex items-center gap-1.5"><UserCheck size={14} /> REPRESENTATION</p>
              {l.is_open_listing ? (
                <>
                  <p className="mt-2 font-semibold text-navy">Open listing. No listing agent.</p>
                  <p className="text-sm text-slate-600 mt-1">Contact the seller directly and negotiate your own commission.</p>
                  {l.seller_phone && (
                    <a href={"tel:" + l.seller_phone} className="mt-2 inline-block text-teal font-semibold">
                      Seller: {l.seller_phone}
                    </a>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-2 font-semibold text-navy">{listingAgent?.full_name ?? "No listing agent set"}</p>
                  {l.commission && (
                    <p className="text-sm text-slate-600 mt-1">Commission: <span className="font-semibold text-navy">{l.commission}</span></p>
                  )}
                </>
              )}
            </div>

            <div className="card p-5 border-navy">
              <p className="flex items-center gap-1.5 text-xs font-bold text-white bg-navy-dark w-fit px-2.5 py-1 rounded-full">
                <Lock size={12} /> INTERNAL
              </p>
              <dl className="mt-3 space-y-2.5 text-sm">
                {builder && (
                  <div>
                    <dt className="text-xs text-slate-500">Builder</dt>
                    <dd className="font-semibold text-navy">{builder.name}
                      {builder.contact_name ? <span className="font-normal text-slate-600"> ({builder.contact_name})</span> : null}
                    </dd>
                    {builder.contact_phone && <dd><a href={"tel:" + builder.contact_phone} className="text-teal font-semibold">{builder.contact_phone}</a></dd>}
                  </div>
                )}
                {l.cobroke_terms && (
                  <div><dt className="text-xs text-slate-500">Co-broke terms</dt>
                    <dd className="font-semibold text-navy">{l.cobroke_terms}</dd></div>
                )}
                {l.source && (
                  <div><dt className="text-xs text-slate-500">Source</dt>
                    <dd className="font-semibold text-navy">{l.source}</dd></div>
                )}
                {l.notes_internal && (
                  <div><dt className="text-xs text-slate-500">Notes</dt>
                    <dd className="text-slate-600 whitespace-pre-line">{l.notes_internal}</dd></div>
                )}
                {l.mls_number && (
                  <div><dt className="text-xs text-slate-500">Old MLS number</dt>
                    <dd className="font-semibold text-navy">{l.mls_number}</dd></div>
                )}
                {l.photos_url && (
                  <div><dt className="text-xs text-slate-500">More photos</dt>
                    <dd><a href={l.photos_url} target="_blank" rel="noopener noreferrer"
                          className="text-teal font-semibold inline-flex items-center gap-1">
                      View more photos <ExternalLink size={13} /></a></dd></div>
                )}
                {!builder && !l.cobroke_terms && !l.source && !l.notes_internal && !l.mls_number && !l.photos_url && (
                  <p className="text-slate-500">No internal details recorded.</p>
                )}
              </dl>
            </div>

            <div className="card p-5">
              <p className="text-xs font-bold text-teal">FUTURE PUBLIC PREVIEW</p>
              <p className="text-xs text-slate-500 mt-1">
                If the site opens to outside buyers later, they would see this name instead of the address:
              </p>
              <p className="mt-2 font-semibold text-navy">{l.public_name}</p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
