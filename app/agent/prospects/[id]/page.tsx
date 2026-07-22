import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabaseServer } from "@/lib/supabase-server";
import { daysRemaining } from "@/lib/access";
import ExtendButton from "@/components/ExtendButton";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProspectIntel({ params }: { params: { id: string } }) {
  const supabase = supabaseServer();
  const { data: p } = await supabase.from("profiles")
    .select("id, full_name, phone, access_expires_at, created_at")
    .eq("id", params.id).single();
  if (!p) notFound();

  const [{ data: views }, { data: favs }, { data: reqs }, { data: exts }] = await Promise.all([
    supabase.from("view_events")
      .select("listing_id, created_at, listings:listing_id(public_name)")
      .eq("user_id", p.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("favorites").select("listing_id, listings:listing_id(public_name)").eq("user_id", p.id),
    supabase.from("leads").select("lead_type, created_at, listings:listing_id(public_name)")
      .eq("user_id", p.id).order("created_at", { ascending: false }),
    supabase.from("access_extensions")
      .select("created_at, agents:agent_id(full_name)")
      .eq("user_id", p.id).order("created_at", { ascending: false })
  ]);

  // build the call brief
  const counts: Record<string, number> = {};
  for (const v of views ?? []) {
    const n = (v as any).listings?.public_name ?? "a listing";
    counts[n] = (counts[n] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a,b) => b[1]-a[1])[0];
  const days = daysRemaining(p.access_expires_at);
  const brief = [
    top ? `Viewed "${top[0]}" ${top[1]} time${top[1] > 1 ? "s" : ""} recently.` : "No listing views yet.",
    favs?.length ? `Favorited ${favs.length} listing${favs.length > 1 ? "s" : ""}.` : null,
    days === null ? "Access never expires." : days === 0 ? "ACCESS EXPIRED." : `Access expires in ${days} day${days === 1 ? "" : "s"}.`
  ].filter(Boolean).join(" ");

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6 min-h-[70vh]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl">{p.full_name || "Unnamed Prospect"}</h1>
            <p className="text-slate-500 mt-1">
              <a href={"tel:" + p.phone} className="text-teal font-semibold">{p.phone}</a> | Joined {new Date(p.created_at).toLocaleDateString()}
            </p>
          </div>
          <ExtendButton userId={p.id} />
        </div>

        {/* CALL BRIEF */}
        <div className="mt-5 card p-5 border-teal bg-teal-light">
          <p className="text-xs font-bold text-teal uppercase tracking-wide">Call Brief</p>
          <p className="mt-1 font-semibold text-navy text-lg leading-snug">{brief}</p>
        </div>

        {/* REQUESTS */}
        <section className="mt-6 card p-5">
          <h2 className="text-lg">Requests</h2>
          <div className="mt-2 divide-y divide-slate-100">
            {(reqs ?? []).map((r: any, i) => (
              <p key={i} className="py-2 text-sm">
                <span className="font-semibold text-navy">{r.lead_type.replace("_"," ")}</span>
                {r.listings?.public_name ? " on " + r.listings.public_name : ""} | {new Date(r.created_at).toLocaleString()}
              </p>
            ))}
            {(!reqs || !reqs.length) && <p className="py-3 text-sm text-slate-500">No requests yet.</p>}
          </div>
        </section>

        {/* ACTIVITY FEED */}
        <section className="mt-4 card p-5">
          <h2 className="text-lg">Viewing Activity</h2>
          <div className="mt-2 divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {(views ?? []).map((v: any, i) => (
              <p key={i} className="py-2 text-sm text-slate-600">
                {v.listings?.public_name ?? "Listing"} <span className="text-slate-400">| {new Date(v.created_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span>
              </p>
            ))}
            {(!views || !views.length) && <p className="py-3 text-sm text-slate-500">No views logged.</p>}
          </div>
        </section>

        {/* EXTENSION HISTORY */}
        <section className="mt-4 card p-5">
          <h2 className="text-lg">Extension History</h2>
          <div className="mt-2 divide-y divide-slate-100">
            {(exts ?? []).map((e: any, i) => (
              <p key={i} className="py-2 text-sm text-slate-600">
                Extended by <span className="font-semibold text-navy">{e.agents?.full_name ?? "Agent"}</span> on {new Date(e.created_at).toLocaleDateString()}
              </p>
            ))}
            {(!exts || !exts.length) && <p className="py-3 text-sm text-slate-500">Never extended.</p>}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
