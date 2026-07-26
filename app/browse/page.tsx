import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard, { type ListingRow } from "@/components/ListingCard";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { townList, TYPE_LABEL, STATUS_LABEL } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function Browse({ searchParams }: { searchParams: Record<string,string> }) {
  const supabase = supabaseServer();

  let q = supabase.from("listings")
    .select("id,status,public_name,town,neighborhood_label,exact_address,price,price_max,price_display,beds,baths,sqft,property_type,delivery_date,created_at")
    .order("created_at", { ascending: false });

  if (searchParams.status) q = q.eq("status", searchParams.status);
  else q = q.neq("status", "archived");
  if (searchParams.town) q = q.eq("town", searchParams.town);
  if (searchParams.type) q = q.eq("property_type", searchParams.type);
  if (searchParams.beds) q = q.gte("beds", Number(searchParams.beds));
  if (searchParams.max) q = q.lte("price", Number(searchParams.max));

  const { data: listings } = await q;

  // cover photo + photo count per listing (signed URLs via server-side admin client)
  const ids = (listings ?? []).map(l => l.id);
  const covers: Record<string, string> = {};
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: media } = await supabase.from("listing_media")
      .select("listing_id, storage_path, visibility")
      .in("listing_id", ids).eq("media_type", "photo")
      .order("sort_order");
    const admin = supabaseAdmin();
    for (const m of media ?? []) {
      counts[m.listing_id] = (counts[m.listing_id] ?? 0) + 1;
      if (!covers[m.listing_id]) {
        const bucket = m.visibility === "internal" ? "listing-media-internal" : "listing-media-public";
        const { data: signed } = await admin.storage.from(bucket).createSignedUrl(m.storage_path, 3600);
        if (signed) covers[m.listing_id] = signed.signedUrl;
      }
    }
  }

  const sel = "input !py-2 text-sm";

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6 min-h-[70vh]">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-2xl md:text-3xl">Inventory</h1>
          <p className="text-sm text-slate-500 font-semibold">{listings?.length ?? 0} listings</p>
        </div>

        {/* FILTER BAR */}
        <form method="get" className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-2 items-end bg-white py-3 z-30 border-b border-slate-100">
          <div><label className="label !mb-1">Town</label>
            <select name="town" defaultValue={searchParams.town ?? ""} className={sel}>
              <option value="">All towns</option>
              {townList().map(t => <option key={t} value={t}>{t}</option>)}
            </select></div>
          <div><label className="label !mb-1">Type</label>
            <select name="type" defaultValue={searchParams.type ?? ""} className={sel}>
              <option value="">All types</option>
              {Object.entries(TYPE_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className="label !mb-1">Beds</label>
            <select name="beds" defaultValue={searchParams.beds ?? ""} className={sel}>
              <option value="">Any</option>{[2,3,4,5].map(b => <option key={b} value={b}>{b}+</option>)}
            </select></div>
          <div><label className="label !mb-1">Max price</label>
            <select name="max" defaultValue={searchParams.max ?? ""} className={sel}>
              <option value="">Any</option>
              {[500000,750000,1000000,1500000,2000000].map(p => <option key={p} value={p}>${(p/1000).toLocaleString()}k</option>)}
            </select></div>
          <div><label className="label !mb-1">Status</label>
            <select name="status" defaultValue={searchParams.status ?? ""} className={sel}>
              <option value="">Active (default)</option>
              {Object.entries(STATUS_LABEL).filter(([v]) => v !== "pending").map(([v,l]) =>
                <option key={v} value={v}>{l}</option>)}
            </select></div>
          <button className="btn-primary !py-2 text-sm">Search</button>
        </form>

        {/* GRID */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {(listings ?? []).map(l => (
            <ListingCard key={l.id}
              l={{ ...l, cover_url: covers[l.id], photo_count: counts[l.id] ?? 0 } as ListingRow} />
          ))}
        </div>
        {(!listings || listings.length === 0) && (
          <p className="mt-12 text-center text-slate-500">
            Nothing matches those filters. Try widening the search, or add a listing.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
