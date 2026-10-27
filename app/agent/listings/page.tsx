import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/access";
import { Pencil } from "lucide-react";
import { canEditListing } from "@/lib/permissions";

export const dynamic = "force-dynamic";


export default async function AgentListings() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles")
    .select("role").eq("id", user!.id).single();

  const { data: listings } = await supabase.from("listings")
    .select("id, status, public_name, town, exact_address, created_at, created_by, is_open_listing, listing_agent_id")
    .order("created_at", { ascending: false });

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6 min-h-[70vh]">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl">Manage Listings</h1>
          <Link href="/agent/listings/new" className="btn-primary !py-2">+ New Listing</Link>
        </div>
        <div className="mt-5 card divide-y divide-slate-100">
          {(listings ?? []).map(l => (
            <div key={l.id} className="p-4 flex items-center justify-between gap-3">
              <Link href={"/listing/" + l.id} className="min-w-0 flex-1 group">
                <p className="font-semibold text-navy truncate group-hover:text-teal">{l.exact_address || l.public_name}</p>
                <p className="text-sm text-slate-500 truncate">
                  {l.town}{l.is_open_listing ? " | Open listing, anyone can edit" : ""} | Added {new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </Link>
              <span className={"badge shrink-0 " + (STATUS_STYLE[l.status] ?? "badge-gray")}>
                {STATUS_LABEL[l.status] ?? l.status}
              </span>
              {canEditListing(l, user!.id, me?.role) && (
                <Link href={"/agent/listings/" + l.id} className="btn-secondary !py-1.5 !px-3 text-sm shrink-0">
                  <Pencil size={14} /> Edit
                </Link>
              )}
            </div>
          ))}
          {(!listings || !listings.length) && <p className="p-8 text-center text-sm text-slate-500">No listings yet. Add the first one.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
