import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { daysRemaining } from "@/lib/access";
import ApproveButtons from "@/components/ApproveButtons";
import ExtendButton from "@/components/ExtendButton";

export const dynamic = "force-dynamic";

export default async function AdminPanel() {
  const supabase = supabaseServer();
  const nowIso = new Date().toISOString();

  const [{ data: pending }, { data: prospects }, { count: total }, { count: active }, { data: extCounts }] = await Promise.all([
    supabase.from("listings").select("id, public_name, town, exact_address, created_at").eq("status","pending").order("created_at"),
    supabase.from("profiles").select("id, full_name, phone, access_expires_at, created_at")
      .eq("role","prospect").order("created_at", { ascending: false }).limit(50),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role","prospect"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role","prospect").gte("access_expires_at", nowIso),
    supabase.from("access_extensions").select("agent_id, agents:agent_id(full_name)")
  ]);

  const leaderboard: Record<string, number> = {};
  for (const e of (extCounts ?? []) as any[]) {
    const n = e.agents?.full_name ?? "Agent";
    leaderboard[n] = (leaderboard[n] ?? 0) + 1;
  }

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Admin</h1>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Kpi n={String(total ?? 0)} l="Total Prospects" />
          <Kpi n={String(active ?? 0)} l="Active Access" />
          <Kpi n={String(pending?.length ?? 0)} l="Pending Approval" />
        </div>

        {/* APPROVAL QUEUE */}
        <section className="mt-8 card p-5">
          <h2 className="text-lg">Approval Queue</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {(pending ?? []).map(l => (
              <div key={l.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy truncate">{l.public_name}</p>
                  <p className="text-sm text-slate-500">{l.town} | <span className="badge-internal !text-[10px]">Internal</span> {l.exact_address}</p>
                </div>
                <ApproveButtons listingId={l.id} />
              </div>
            ))}
            {(!pending || !pending.length) && <p className="py-6 text-sm text-slate-500 text-center">Queue clear.</p>}
          </div>
        </section>

        {/* EXTENSION LEADERBOARD */}
        <section className="mt-6 card p-5">
          <h2 className="text-lg">Extensions by Agent</h2>
          <div className="mt-3 space-y-2">
            {Object.entries(leaderboard).sort((a,b) => b[1]-a[1]).map(([name, n]) => (
              <div key={name} className="flex items-center justify-between">
                <p className="font-semibold text-navy">{name}</p>
                <span className="badge-teal">{n}</span>
              </div>
            ))}
            {!Object.keys(leaderboard).length && <p className="text-sm text-slate-500">No extensions logged yet.</p>}
          </div>
        </section>

        {/* PROSPECTS */}
        <section className="mt-6 card p-5">
          <h2 className="text-lg">Recent Prospects</h2>
          <div className="mt-3 divide-y divide-slate-100">
            {(prospects ?? []).map(p => {
              const d = daysRemaining(p.access_expires_at);
              return (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={"/agent/prospects/" + p.id} className="font-semibold text-navy hover:text-teal truncate block">
                      {p.full_name || "Unnamed"}
                    </Link>
                    <p className="text-sm text-slate-500">{p.phone} | {d === null ? "never expires" : d === 0 ? "EXPIRED" : d + " days left"}</p>
                  </div>
                  <ExtendButton userId={p.id} />
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Kpi({ n, l }: { n: string; l: string }) {
  return (
    <div className="card p-4 text-center">
      <p className="text-3xl font-extrabold text-navy">{n}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1">{l}</p>
    </div>
  );
}
