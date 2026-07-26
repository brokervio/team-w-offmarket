import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatPrice, STATUS_LABEL, TYPE_LABEL } from "@/lib/access";
import { BedDouble, Bath, Ruler, MapPin, CalendarDays, Camera } from "lucide-react";

export const dynamic = "force-dynamic";

// PUBLIC page: a client opens this from a link their agent sent.
// Shows exactly one listing. No login, no navigation into the portal.
// Only client-safe fields are rendered; internal data never leaves the server.
export default async function SharedListing({ params }: { params: { token: string } }) {
  const admin = supabaseAdmin();

  const { data: share } = await admin.from("listing_shares")
    .select("listing_id, revoked, agent:created_by(full_name)")
    .eq("token", params.token).maybeSingle();
  if (!share || share.revoked) notFound();

  const { data: l } = await admin.from("listings")
    .select("id, status, public_name, exact_address, town, neighborhood_label, price, price_max, price_display, beds, baths, sqft, lot_desc, property_type, delivery_date, description_public")
    .eq("id", share.listing_id).single();
  if (!l) notFound();

  const { data: media } = await admin.from("listing_media")
    .select("storage_path, visibility")
    .eq("listing_id", l.id).eq("media_type", "photo").eq("visibility", "public")
    .order("sort_order");
  const photos: string[] = [];
  for (const m of media ?? []) {
    const { data: signed } = await admin.storage.from("listing-media-public")
      .createSignedUrl(m.storage_path, 86400);
    if (signed) photos.push(signed.signedUrl);
  }

  const agent = share.agent as unknown as { full_name: string | null } | null;

  return (
    <div className="min-h-screen bg-surface">
      {/* CLIENT HEADER */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Team W Realty" className="h-9 w-auto" />
          <p className="text-xs font-semibold text-slate-500">
            Presented by {agent?.full_name ?? "Team W Realty"}
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 pb-16">
        {/* GALLERY */}
        {photos.length === 0 ? (
          <div className="aspect-[3/1] card flex flex-col items-center justify-center gap-2 text-slate-400">
            <Camera size={36} />
            <p className="text-sm font-semibold">Photos coming soon. Ask your agent.</p>
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

        <div className="mt-6 card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-3xl font-extrabold text-navy">{formatPrice(l)}</p>
              <p className="mt-1 text-lg font-semibold text-navy flex items-center gap-1.5">
                <MapPin size={18} className="text-teal" /> {l.exact_address || l.public_name}
              </p>
              <p className="text-sm text-slate-500 mt-0.5">{l.town}{l.neighborhood_label ? ", " + l.neighborhood_label : ""}</p>
            </div>
            <span className="badge bg-teal text-white shrink-0">{STATUS_LABEL[l.status] ?? l.status}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-5 text-navy font-semibold border-y border-slate-100 py-4">
            {l.beds ? <span className="flex items-center gap-1.5"><BedDouble size={18} className="text-teal"/>{l.beds} beds</span> : null}
            {l.baths ? <span className="flex items-center gap-1.5"><Bath size={18} className="text-teal"/>{l.baths} baths</span> : null}
            {l.sqft ? <span className="flex items-center gap-1.5"><Ruler size={18} className="text-teal"/>{l.sqft.toLocaleString()} sqft</span> : null}
            <span className="text-sm text-slate-500 font-normal">{TYPE_LABEL[l.property_type] ?? l.property_type}</span>
            {l.delivery_date && (
              <span className="flex items-center gap-1.5 text-sm text-slate-500 font-normal">
                <CalendarDays size={15}/> Delivery {new Date(l.delivery_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          {l.description_public && (
            <p className="mt-4 text-slate-600 whitespace-pre-line leading-relaxed">{l.description_public}</p>
          )}
        </div>

        <div className="mt-6 card p-6 text-center bg-navy text-white border-navy">
          <p className="text-lg font-bold text-white">Interested in this property?</p>
          <p className="text-sm text-slate-200 mt-1">
            This is an off-market opportunity. Reply to {agent?.full_name ?? "your Team W agent"} or call the office.
          </p>
          <a href="tel:845-422-5238" className="btn-primary mt-4 !px-8">Call 845-422-5238</a>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Team W Realty LLC | Licensed Real Estate Broker | 55 Old Turnpike Rd #408, Nanuet, NY.
          Shared privately with you. Please do not repost publicly.
        </p>
      </main>
    </div>
  );
}
