import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { type ListingRow } from "@/components/ListingCard";
import BrowseGrid from "@/components/BrowseGrid";
import { supabaseServer, supabaseAdmin, getCurrentUser } from "@/lib/supabase-server";
import { townList, TYPE_LABEL, STATUS_LABEL } from "@/lib/access";
import { builderMatchClauses, type Builder } from "@/lib/builders";

export const dynamic = "force-dynamic";

export default async function Browse({ searchParams }: { searchParams: Record<string,string> }) {
  const supabase = supabaseServer();
  // Run the independent lookups together instead of one after another.
  // Each round trip to the database costs time; doing them in parallel
  // is the single biggest speed win on this page.
  const [user, { data: builderRows }] = await Promise.all([
    getCurrentUser(),
    supabase.from("builders").select("id, name, contact_phone").order("name")
  ]);
  const builders = (builderRows ?? []) as Builder[];
  const meQuery = supabase.from("profiles")
    .select("full_name, phone, avatar_path").eq("id", user!.id).single();

  let q = supabase.from("listings")
    .select("id,status,public_name,town,neighborhood_label,exact_address,price,price_max,price_display,beds,baths,sqft,property_type,delivery_date,created_at")
    .order("created_at", { ascending: false });

  if (searchParams.status) q = q.eq("status", searchParams.status);
  else q = q.neq("status", "archived");
  if (searchParams.town) q = q.eq("town", searchParams.town);
  if (searchParams.type) q = q.eq("property_type", searchParams.type);
  if (searchParams.beds) q = q.gte("beds", Number(searchParams.beds));
  if (searchParams.max) q = q.lte("price", Number(searchParams.max));
  if (searchParams.rep === "open") q = q.eq("is_open_listing", true);
  if (searchParams.rep === "agent") q = q.eq("is_open_listing", false).eq("is_outside_listing", false);
  if (searchParams.rep === "outside") q = q.eq("is_outside_listing", true);
  if (searchParams.builder) {
    if (searchParams.builder === "any") {
      // every listing tied to a builder, linked or typed in by hand
      const all = builders.flatMap(builderMatchClauses);
      q = all.length ? q.or(all.join(",")) : q.not("builder_id", "is", null);
    } else {
      const b = builders.find(x => x.id === searchParams.builder);
      if (b) q = q.or(builderMatchClauses(b).join(","));
    }
  }
  if (searchParams.q) {
    const s = searchParams.q.replace(/[,()%*]/g, " ").trim();
    if (s) {
      const clauses = [
        `exact_address.ilike.*${s}*`, `public_name.ilike.*${s}*`, `mls_number.ilike.*${s}*`,
        `town.ilike.*${s}*`, `neighborhood_label.ilike.*${s}*`,
        `seller_phone.ilike.*${s}*`, `source.ilike.*${s}*`, `notes_internal.ilike.*${s}*`,
        `outside_agent_name.ilike.*${s}*`, `outside_brokerage.ilike.*${s}*`, `outside_agent_phone.ilike.*${s}*`
      ];
      const digits = s.replace(/\D/g, "");
      if (digits.length >= 7) clauses.push(`seller_phone_digits.like.*${digits}*`);
      // typing a builder's name also pulls that builder's listings
      const words = s.toLowerCase().split(/\s+/).filter(Boolean);
      for (const b of builders) {
        const n = b.name.toLowerCase();
        if (words.every(w => n.includes(w))) clauses.push(...builderMatchClauses(b));
      }
      q = q.or(clauses.join(","));
    }
  }

  const [{ data: me }, { data: listings }] = await Promise.all([meQuery, q]);

  // cover photo + photo count per listing. Signed URLs are requested in one
  // batch per bucket (previously one request per listing, in sequence).
  const ids = (listings ?? []).map(l => l.id);
  const covers: Record<string, string> = {};
  const counts: Record<string, number> = {};
  if (ids.length) {
    const { data: media } = await supabase.from("listing_media")
      .select("listing_id, storage_path, visibility")
      .in("listing_id", ids).eq("media_type", "photo")
      .order("sort_order");
    const firstByBucket: Record<string, { listing_id: string; path: string }[]> = {};
    for (const m of media ?? []) {
      counts[m.listing_id] = (counts[m.listing_id] ?? 0) + 1;
      if (counts[m.listing_id] === 1) {
        const bucket = m.visibility === "internal" ? "listing-media-internal" : "listing-media-public";
        (firstByBucket[bucket] ??= []).push({ listing_id: m.listing_id, path: m.storage_path });
      }
    }
    const admin = supabaseAdmin();
    await Promise.all(Object.entries(firstByBucket).map(async ([bucket, items]) => {
      const { data: signed } = await admin.storage.from(bucket)
        .createSignedUrls(items.map(i => i.path), 3600);
      (signed ?? []).forEach((sg, i) => { if (sg?.signedUrl) covers[items[i].listing_id] = sg.signedUrl; });
    }));
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
        <form method="get" className="mt-4 grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2 items-end bg-white py-3 z-30 border-b border-slate-100">
          <div className="col-span-2"><label className="label !mb-1">Search</label>
            <input name="q" defaultValue={searchParams.q ?? ""} className={sel}
                   placeholder="Address, builder, agent, phone..." /></div>
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
              <option value="">All except archived</option>
              {Object.entries(STATUS_LABEL).map(([v,l]) =>
                <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className="label !mb-1">Listing</label>
            <select name="rep" defaultValue={searchParams.rep ?? ""} className={sel}>
              <option value="">All</option>
              <option value="open">Open listings</option>
              <option value="agent">Team W listing agent</option>
              <option value="outside">Other brokerage</option>
            </select></div>
          <div><label className="label !mb-1">Builder</label>
            <select name="builder" defaultValue={searchParams.builder ?? ""} className={sel}>
              <option value="">All builders</option>
              <option value="any">Any builder</option>
              {builders.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select></div>
          <button className="btn-primary !py-2 text-sm">Search</button>
        </form>

        {/* GRID with multi-select for client links */}
        <BrowseGrid listings={(listings ?? []).map(l =>
          ({ ...l, cover_url: covers[l.id], photo_count: counts[l.id] ?? 0 } as ListingRow))}
          sender={{ name: me?.full_name ?? "", phone: me?.phone?.trim() ?? "", hasPhoto: !!me?.avatar_path }} />
      </main>
      <Footer />
    </>
  );
}
