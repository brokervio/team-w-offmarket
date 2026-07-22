import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { supabaseServer } from "@/lib/supabase-server";
import { townList, TYPE_LABEL } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function Browse({ searchParams }: { searchParams: Record<string,string> }) {
  const supabase = supabaseServer();
  let q = supabase.from("public_listings")
    .select("id,status,public_name,town,neighborhood_label,price,price_max,price_display,beds,baths,sqft,property_type,delivery_date")
    .order("published_at", { ascending: false });

  if (searchParams.town) q = q.eq("town", searchParams.town);
  if (searchParams.type) q = q.eq("property_type", searchParams.type);
  if (searchParams.beds) q = q.gte("beds", Number(searchParams.beds));
  if (searchParams.max) q = q.lte("price", Number(searchParams.max));
  if (searchParams.status) q = q.eq("status", searchParams.status);

  const { data: listings } = await q;

  // attach cover photos (public media only, RLS-enforced)
  const ids = (listings ?? []).map(l => l.id);
  const covers: Record<string,string> = {};
  if (ids.length) {
    const { data: media } = await supabase.from("listing_media")
      .select("listing_id, storage_path")
      .in("listing_id", ids).eq("visibility","public").eq("media_type","photo")
      .order("sort_order").limit(200);
    for (const m of media ?? []) {
      if (!covers[m.listing_id]) {
        const { data: signed } = await supabase.storage
          .from("listing-media-public").createSignedUrl(m.storage_path, 3600);
        if (signed) covers[m.listing_id] = signed.signedUrl;
      }
    }
  }

  const sel = "input !py-2 text-sm";

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {searchParams.welcome && (
          <div className="mb-5 rounded-card bg-teal-light border border-teal px-4 py-3 text-navy font-semibold">
            You have 14 days of full access. Make them count.
          </div>
        )}
        <h1 className="text-2xl md:text-3xl">Off-Market Inventory</h1>

        {/* FILTER BAR */}
        <form method="get" className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-2 items-end sticky top-16 bg-white py-3 z-30 border-b border-slate-100">
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
              <option value="">All</option>
              <option value="coming_soon">Coming Soon</option>
              <option value="available">Available</option>
              <option value="in_contract">In Contract</option>
            </select></div>
          <button className="btn-primary !py-2 text-sm">Search</button>
        </form>

        {/* GRID */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(listings ?? []).map(l => <ListingCard key={l.id} l={{ ...l, cover_url: covers[l.id] } as any} />)}
        </div>
        {(!listings || listings.length === 0) && (
          <p className="mt-12 text-center text-slate-500">No inventory matches those filters yet. New deals drop weekly. Widen the search or check back soon.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
