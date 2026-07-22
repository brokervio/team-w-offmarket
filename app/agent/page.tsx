import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { daysRemaining } from "@/lib/access";
import ExtendButton from "@/components/ExtendButton";

export const dynamic = "force-dynamic";

export default async function AgentDashboard() {
  const supabase = supabaseServer();
  const soon = new Date(Date.now() + 7 * 86400000).toISOString();

  const [{ data: expiring }, { data: leads }, { count: activeCount }, { count: listingCount }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone, access_expires_at")
      .eq("role","prospect").not("access_expires_at","is",null)
      .lte("access_expires_at", soon).gte("access_expires_at", new Date().toISOString())
      .order("access_expires_at"),
    supabase.from("leads").select("id, lead_type, status, created_at, user_id, listing_id, profiles:user_id(full_name, phone), listings:listing_id(public_name)")
      .eq("status","new").order("created_at", { ascending: false }).limit(20),
    supabase.from("profiles").select("id", { count: "exact", head: true })
      .eq("role","prospect").gte("access_expires_at", new Date().toISOString()),
    supabase.from("listings").select("id", { count: "exact", head: true })
      .in("status", ["coming_soon","available"])
  ]);

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Agent Dashboard</h1>

        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi n={String(activeCount ?? 0)} l="Active Prospects" />
          <Kpi n={String(expiring?.length ?? 0)} l="Expiring in 7 Days" accent />
          <Kpi n={String(leads?.length ?? 0)} l="New Lead Requests" />
          <Kpi n={String(listingCount ?? 0)} l="Listings Live" />
        </div>

        <div className="mt-8 grid lg:grid-cols-2 gap-6">
          {/* EXPIRING SOON */}
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg">Expiring Soon</h2>
              <Link href="/agent/listings" className="text-sm font-semibold text-teal">Manage Listings</Link>
            </div>
            <div className="mt-3 divide-y divide-slate-100">
              {(expiring ?? []).map(p => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={"/agent/prospects/" + p.id} className="font-semibold text-navy hover:text-teal truncate block">{p.full_name || "Unnamed"}</Link>
                    <p className="text-sm text-slate-500">
                      {daysRemaining(p.access_expires_at)} days left | <a href={"tel:" + p.phone} className="text-teal">{p.phone}</a>
                    </p>
                  </div>
                  <ExtendButton userId={p.id} />
                </div>
              ))}
              {(!expiring || !expiring.length) && <p className="py-6 text-sm text-slate-500 text-center">No prospects expiring this week.</p>}
            </div>
          </section>

          {/* LEAD INBOX */}
          <section className="card p-5">
            <h2 className="text-lg">New Lead Requests</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {(leads ?? []).map((ld: any) => (
                <div key={ld.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={"/agent/prospects/" + ld.user_id} className="font-semibold text-navy hover:text-teal">
                      {ld.profiles?.full_name ?? "Prospect"}
                    </Link>
                    <span className="badge-teal">{ld.lead_type.replace("_"," ")}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {ld.listings?.public_name ?? "General"} | {new Date(ld.created_at).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}
                  </p>
                  {ld.profiles?.phone && <a href={"tel:" + ld.profiles.phone} className="text-sm font-semibold text-teal">{ld.profiles.phone}</a>}
                </div>
              ))}
              {(!leads || !leads.length) && <p className="py-6 text-sm text-slate-500 text-center">Inbox clear. Go make some calls.</p>}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Kpi({ n, l, accent = false }: { n: string; l: string; accent?: boolean }) {
  return (
    <div className={"card p-4 text-center " + (accent ? "border-teal bg-teal-light" : "")}>
      <p className="text-3xl font-extrabold text-navy">{n}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1">{l}</p>
    </div>
  );
}
