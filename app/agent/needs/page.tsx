import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { formatPrice, TYPE_LABEL } from "@/lib/access";
import { needMatchesListing, type BuyerNeed, type MatchableListing } from "@/lib/match";
import NeedForm from "@/components/NeedForm";
import NeedActions from "@/components/NeedActions";
import { Flame } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BuyerNeeds() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = me?.role === "admin";

  const [{ data: needs }, { data: listings }] = await Promise.all([
    supabase.from("buyer_needs")
      .select("*, agent:agent_id(full_name, phone)")
      .neq("status", "archived")
      .order("status")
      .order("created_at", { ascending: false }),
    supabase.from("listings")
      .select("id, status, town, property_type, beds, price, price_max, price_display, public_name, exact_address")
      .not("status", "in", "(sold,archived)")
  ]);

  const rows = (needs ?? []) as (BuyerNeed & { agent: { full_name: string | null; phone: string | null } })[];
  const inv = (listings ?? []) as (MatchableListing & Record<string, any>)[];

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Buyer Needs</h1>
        <p className="text-sm text-slate-500 mt-1">
          What the whole team's buyers are looking for. When inventory matches a buyer, it lights up here and on the listing page.
        </p>

        <NeedForm currentUserId={user!.id} />

        <div className="mt-6 space-y-3">
          {rows.map(n => {
            const matches = inv.filter(l => needMatchesListing(n, l));
            const canManage = isAdmin || n.agent_id === user!.id;
            const criteria = [
              n.town !== "Any" ? n.town : "Any town",
              n.property_type !== "any" ? (TYPE_LABEL[n.property_type] ?? n.property_type) : "any type",
              n.min_beds ? n.min_beds + "+ beds" : null,
              n.max_price ? "under $" + Number(n.max_price).toLocaleString() : null
            ].filter(Boolean).join(" | ");
            return (
              <div key={n.id} className={"card p-4 " + (n.status === "fulfilled" ? "opacity-60" : "")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy flex items-center gap-2">
                      {n.client_label}
                      {n.status === "fulfilled" && <span className="badge-gray">found a home</span>}
                      {n.status === "active" && matches.length > 0 && (
                        <span className="badge-teal flex items-center gap-1"><Flame size={11} /> {matches.length} {matches.length === 1 ? "match" : "matches"}</span>
                      )}
                    </p>
                    <p className="text-sm text-slate-500 mt-0.5">{criteria}</p>
                    {n.notes && <p className="text-sm text-slate-600 mt-1">{n.notes}</p>}
                    <p className="text-xs text-slate-400 mt-1">
                      Buyer of {n.agent?.full_name ?? "an agent"}{n.agent?.phone ? " | " + n.agent.phone : ""}
                    </p>
                  </div>
                  {canManage && <NeedActions needId={n.id} status={n.status} />}
                </div>
                {n.status === "active" && matches.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {matches.map(m => (
                      <Link key={m.id} href={"/listing/" + m.id}
                            className="text-xs font-semibold bg-teal-light text-navy border border-teal rounded-full px-3 py-1 hover:bg-teal hover:text-white transition-colors">
                        {(m.exact_address || m.public_name) + " | " + formatPrice(m as any)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!rows.length && (
            <p className="p-8 text-center text-sm text-slate-500 card">No buyers on the board yet. Add the first one above.</p>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
