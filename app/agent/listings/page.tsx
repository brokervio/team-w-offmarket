import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string,string> = {
  draft: "badge-gray", pending: "badge-gray", coming_soon: "badge-teal",
  available: "badge-navy", in_contract: "badge-gray", sold: "badge-gray", archived: "badge-gray"
};

export default async function AgentListings() {
  const supabase = supabaseServer();
  const { data: listings } = await supabase.from("listings")
    .select("id, status, public_name, town, exact_address, created_at")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6 min-h-[70vh]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl">Listings</h1>
          <Link href="/agent/listings/new" className="btn-primary !py-2">+ New Listing</Link>
        </div>
        <div className="mt-5 card divide-y divide-slate-100">
          {(listings ?? []).map(l => (
            <div key={l.id} className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-navy truncate">{l.public_name}</p>
                <p className="text-sm text-slate-500 truncate">
                  {l.town} | <span className="badge-internal !text-[10px]">Internal</span> {l.exact_address}
                </p>
              </div>
              <span className={STATUS_STYLE[l.status]}>{l.status.replace("_"," ")}</span>
            </div>
          ))}
          {(!listings || !listings.length) && <p className="p-8 text-center text-sm text-slate-500">No listings yet. Add the first one.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
