import { Suspense } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { type ListingRow } from "@/components/ListingCard";
import BrowseGrid from "@/components/BrowseGrid";
import BrowseFilters from "@/components/BrowseFilters";
import { supabaseServer, supabaseAdmin, getCurrentUser } from "@/lib/supabase-server";
import { ROCKLAND_TOWNS, OUTSIDE_TOWNS, TYPE_LABEL, STATUS_LABEL } from "@/lib/access";
import { builderMatchClauses, type Builder } from "@/lib/builders";

export const dynamic = "force-dynamic";

// The filter bar renders right away and stays put. Only the results
// below it reload when a filter changes, so dropdowns search instantly
// without the page blanking out.
export default async function Browse({ searchParams }: { searchParams: Record<string,string> }) {
  const supabase = supabaseServer();
  const { data: builderRows } = await supabase.from("builders").select("id, name, contact_phone").order("name");
  const builders = (builderRows ?? []) as Builder[];
  const opts = (r: Record<string,string>) => Object.entries(r).map(([value, label]) => ({ value, label }));

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Inventory</h1>
        <BrowseFilters rockland={ROCKLAND_TOWNS} outside={OUTSIDE_TOWNS}
          types={opts(TYPE_LABEL)} statuses={opts(STATUS_LABEL)}
          builders={builders.map(b => ({ value: b.id, label: b.name }))} />
        <Suspense key={JSON.stringify(searchParams)} fallback={<ResultsSkeleton />}>
          <Results searchParams={searchParams} builders={builders} />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function ResultsSkeleton() {
  return (
    <>
      <p className="mt-4 text-sm text-slate-500 font-semibold">Searching...</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card h-72 animate-pulse bg-slate-100" />
        ))}
      </div>
    </>
  );
}

async function Results({ searchParams, builders }: { searchParams: Record<string,string>; builders: Builder[] }) {
  const supabase = supabaseServer();
  const user = await getCurrentUser();
  const meQuery = supabase.from("profiles")
    .select("full_name, phone, avatar_path").eq("id", user!.id).single();

  let q = supabase.from("listings")
    .select("id,status,public_name,town,neighborhood_label,exact_address,price,price_max,price_display,beds,baths,sqft,property_type,delivery_date,created_at,is_fsbo")
    .order("created_at", { ascending: false });

  if (searchParams.status) q = q.eq("status", searchParams.status);
  else q = q.neq("status", "archived");
  if (searchParams.town) q = q.eq("town", searchParams.town);
  if (searchParams.type) q = q.eq("property_type", searchParams.type);
  if (searchParams.beds) q = q.gte("beds", Number(searchParams.beds));
  const min = Number((searchParams.min ?? "").replace(/\D/g, ""));
  const max = Number((searchParams.max ?? "").replace(/\D/g, ""));
  if (min) q = q.gte("price", min);
  if (max) q = q.lte("price", max);
  if (searchParams.fsbo === "only") q = q.eq("is_fsbo", true);
  if (searchParams.fsbo === "hide") q = q.eq("is_fsbo", false);
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

  return (
    <>
      <p className="mt-4 text-sm text-slate-500 font-semibold">{listings?.length ?? 0} listings</p>
      {/* GRID with multi-select for client links */}
      <BrowseGrid listings={(listings ?? []).map(l =>
        ({ ...l, cover_url: covers[l.id], photo_count: counts[l.id] ?? 0 } as ListingRow))}
        sender={{ name: me?.full_name ?? "", phone: me?.phone?.trim() ?? "", hasPhoto: !!me?.avatar_path }} />
    </>
  );
}
