import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase-server";
import { formatPrice, STATUS_LABEL, TYPE_LABEL } from "@/lib/access";
import { BedDouble, Bath, Ruler, MapPin, Camera } from "lucide-react";

export const dynamic = "force-dynamic";

// PUBLIC page: a client opens one link and sees the whole set of
// properties their agent picked for them. No login, no portal access.
export default async function SharedCollection({ params }: { params: { token: string } }) {
  const admin = supabaseAdmin();

  const { data: col } = await admin.from("listing_collections")
    .select("id, show_address, revoked, agent:created_by(full_name, phone, contact_email, avatar_path)")
    .eq("token", params.token).maybeSingle();
  if (!col || col.revoked) notFound();

  const { data: items } = await admin.from("listing_collection_items")
    .select("sort_order, listing:listing_id(id, status, public_name, exact_address, town, neighborhood_label, price, price_max, price_display, beds, baths, sqft, property_type)")
    .eq("collection_id", col.id).order("sort_order");

  const listings = (items ?? [])
    .map(i => i.listing as any)
    .filter(l => l && l.status !== "archived");
  if (!listings.length) notFound();

  // cover photo per listing
  const ids = listings.map(l => l.id);
  const covers: Record<string, string> = {};
  const { data: media } = await admin.from("listing_media")
    .select("listing_id, storage_path")
    .in("listing_id", ids).eq("media_type", "photo").eq("visibility", "public")
    .order("sort_order");
  for (const m of media ?? []) {
    if (!covers[m.listing_id]) {
      const { data: signed } = await admin.storage.from("listing-media-public")
        .createSignedUrl(m.storage_path, 86400);
      if (signed) covers[m.listing_id] = signed.signedUrl;
    }
  }

  const agent = col.agent as unknown as {
    full_name: string | null; phone: string | null;
    contact_email: string | null; avatar_path: string | null;
  } | null;
  let avatarUrl: string | null = null;
  if (agent?.avatar_path) {
    const { data: av } = await admin.storage.from("listing-media-public")
      .createSignedUrl(agent.avatar_path, 86400);
    if (av) avatarUrl = av.signedUrl;
  }
  const agentPhone = agent?.phone || "845-422-5238";

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Team W Realty" className="h-9 w-auto" />
          <p className="text-xs font-semibold text-slate-500">
            Presented by {agent?.full_name ?? "Team W Realty"}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-16">
        <h1 className="text-2xl md:text-3xl">Hand-picked for you</h1>
        <p className="text-sm text-slate-500 mt-1">
          {listings.length} off-market {listings.length === 1 ? "property" : "properties"}, none of them publicly listed. Tap any one for photos and details.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map(l => (
            <Link key={l.id} href={`/share/c/${params.token}/${l.id}`}
                  className="card group h-full flex flex-col hover:shadow-md transition-shadow">
              <div className="relative aspect-[3/2] bg-slate-100 overflow-hidden">
                {covers[l.id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={covers[l.id]} alt={l.public_name}
                       className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Camera size={28} />
                    <span className="text-xs font-semibold">Photos on request</span>
                  </div>
                )}
                <span className="absolute top-3 left-3 badge bg-teal text-white">
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
              </div>
              <div className="p-4 flex-1 flex flex-col gap-1">
                <p className="text-xl font-extrabold text-navy">{formatPrice(l)}</p>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  {l.beds ? <span className="flex items-center gap-1"><BedDouble size={15}/>{l.beds} bd</span> : null}
                  {l.baths ? <span className="flex items-center gap-1"><Bath size={15}/>{l.baths} ba</span> : null}
                  {l.sqft ? <span className="flex items-center gap-1"><Ruler size={15}/>{l.sqft.toLocaleString()} sqft</span> : null}
                </div>
                <p className="font-semibold text-navy text-sm leading-snug mt-1 truncate">
                  {col.show_address && l.exact_address ? l.exact_address : l.public_name}
                </p>
                <p className="flex items-center gap-1 text-xs text-slate-500 mt-auto pt-1">
                  <MapPin size={12} /> {l.town} <span className="text-slate-300">|</span> {TYPE_LABEL[l.property_type] ?? l.property_type}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* AGENT CONTACT */}
        <div className="mt-8 card p-6 bg-navy text-white border-navy">
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center text-center sm:text-left">
            {avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={agent?.full_name ?? "Agent"}
                   className="w-20 h-20 rounded-full object-cover border-2 border-teal shrink-0" />
            )}
            <div>
              <p className="text-lg font-bold text-white">Want to see any of these?</p>
              <p className="text-sm text-slate-200 mt-1">
                Reach out to {agent?.full_name ?? "Team W Realty"} and we can walk through them together.
              </p>
              <div className="mt-3 flex flex-col sm:flex-row gap-2 justify-center sm:justify-start">
                <a href={"tel:" + agentPhone} className="btn-primary !px-6 !py-2 text-sm">Call {agentPhone}</a>
                {agent?.contact_email && (
                  <a href={"mailto:" + agent.contact_email} className="btn-secondary !px-6 !py-2 text-sm !border-white !text-white hover:!bg-white/10">
                    Email {agent.full_name?.split(" ")[0] ?? "the agent"}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Team W Realty LLC | Licensed Real Estate Broker | 55 Old Turnpike Rd #408, Nanuet, NY.
          Shared privately with you. Please do not repost publicly.
        </p>
      </main>
    </div>
  );
}
