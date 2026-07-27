import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/access";
import { needMatchesListing, type BuyerNeed } from "@/lib/match";
import { Home, Users, Flame, Eye, ArrowRight, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type NeedRow = BuyerNeed & { agent: { full_name: string | null; phone: string | null } };

export default async function Dashboard() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles")
    .select("full_name, role, last_seen_at").eq("id", user!.id).single();

  // "new" = since last visit; first visit falls back to the last 7 days
  const since = me?.last_seen_at ?? new Date(Date.now() - 7 * 86400000).toISOString();

  const [{ data: listings }, { data: needs }, { data: myShares }, { data: myCols }, { data: intelPosts }, { data: intelReplies }] = await Promise.all([
    supabase.from("listings")
      .select("id, status, public_name, exact_address, town, property_type, beds, price, price_max, price_display, created_by, listing_agent_id, created_at")
      .not("status", "in", "(sold,archived)"),
    supabase.from("buyer_needs")
      .select("*, agent:agent_id(full_name, phone)")
      .eq("status", "active"),
    supabase.from("listing_shares")
      .select("view_count, last_viewed_at, listing:listing_id(public_name, exact_address)")
      .eq("created_by", user!.id).gt("view_count", 0),
    supabase.from("listing_collections")
      .select("view_count, last_viewed_at, items:listing_collection_items(listing_id)")
      .eq("created_by", user!.id).gt("view_count", 0),
    supabase.from("intel_posts")
      .select("id, location, question, created_at, author_id, author:author_id(full_name)")
      .eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("intel_replies")
      .select("id, body, created_at, author_id, author:author_id(full_name), post:post_id(location, author_id)")
      .gt("created_at", since)
  ]);

  const inv = listings ?? [];
  const activeNeeds = (needs ?? []) as NeedRow[];

  const newListings = inv.filter(l => l.created_at > since);
  const newBuyers = activeNeeds.filter(n => n.created_at > since);

  // buyers on the board that fit MY listings
  const myListings = inv.filter(l => l.created_by === user!.id || l.listing_agent_id === user!.id);
  const buyersForMine = myListings
    .map(l => ({ listing: l, buyers: activeNeeds.filter(n => needMatchesListing(n, l as any)) }))
    .filter(x => x.buyers.length > 0);

  // inventory that fits MY buyers
  const myNeeds = activeNeeds.filter(n => n.agent_id === user!.id);
  const matchesForMyBuyers = myNeeds
    .map(n => ({ need: n, matches: inv.filter(l => needMatchesListing(n, l as any)) }))
    .filter(x => x.matches.length > 0);

  // link opens since last visit
  const recentViews = [
    ...(myShares ?? []).map((s: any) => ({
      label: s.listing?.exact_address || s.listing?.public_name || "Listing link",
      views: s.view_count, when: s.last_viewed_at
    })),
    ...(myCols ?? []).map((c: any) => ({
      label: `${c.items?.length ?? 0} property set`,
      views: c.view_count, when: c.last_viewed_at
    }))
  ].filter(v => v.when && v.when > since);

  // team intel: open questions, new ones, and answers on my posts
  const openQuestions = (intelPosts ?? []) as any[];
  const newQuestions = openQuestions.filter(p => p.created_at > since);
  const answersForMe = ((intelReplies ?? []) as any[])
    .filter(r => r.post?.author_id === user!.id && r.author_id !== user!.id);

  // stamp the visit (service role; only this field)
  const admin = supabaseAdmin();
  await admin.from("profiles").update({ last_seen_at: new Date().toISOString() }).eq("id", user!.id);

  const firstName = (me?.full_name ?? "").split(" ")[0] || "there";
  const allQuiet = !newListings.length && !newBuyers.length && !buyersForMine.length
    && !matchesForMyBuyers.length && !recentViews.length
    && !newQuestions.length && !answersForMe.length;

  const label = (l: any) => l.exact_address || l.public_name;

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Welcome back, {firstName}</h1>
        <p className="text-sm text-slate-500 mt-1">Here is what happened since your last visit.</p>

        {/* STAT TILES */}
        <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
          <Tile href="/browse" n={newListings.length} l="New Listings" icon={<Home size={16} />} />
          <Tile href="/agent/needs" n={newBuyers.length} l="New Buyers" icon={<Users size={16} />} />
          <Tile href="/agent/needs" n={buyersForMine.reduce((a, x) => a + x.buyers.length, 0)} l="Buyers for Your Listings" icon={<Flame size={16} />} accent />
          <Tile href="/agent/links" n={recentViews.length} l="Links Opened" icon={<Eye size={16} />} />
          <Tile href="/agent/intel" n={openQuestions.length} l="Open Questions" icon={<MessageCircle size={16} />} />
        </div>

        {allQuiet && (
          <div className="mt-8 card p-10 text-center">
            <p className="text-lg font-bold text-navy">All caught up.</p>
            <p className="text-sm text-slate-500 mt-1">Nothing new since your last visit. Go find something off-market.</p>
            <Link href="/browse" className="btn-primary mt-5">Browse inventory <ArrowRight size={15} /></Link>
          </div>
        )}

        <div className="mt-6 grid lg:grid-cols-2 gap-5">
          {/* BUYERS FOR MY LISTINGS */}
          {buyersForMine.length > 0 && (
            <section className="card p-5 border-teal">
              <h2 className="text-lg flex items-center gap-2"><Flame size={18} className="text-teal" /> Buyers for your listings</h2>
              <div className="mt-3 space-y-3">
                {buyersForMine.map(x => (
                  <div key={x.listing.id}>
                    <Link href={"/listing/" + x.listing.id} className="font-semibold text-navy hover:text-teal text-sm">
                      {label(x.listing)}
                    </Link>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {x.buyers.map(b => `${b.client_label} (${b.agent?.full_name ?? "agent"})`).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* MATCHES FOR MY BUYERS */}
          {matchesForMyBuyers.length > 0 && (
            <section className="card p-5">
              <h2 className="text-lg">Homes for your buyers</h2>
              <div className="mt-3 space-y-3">
                {matchesForMyBuyers.map(x => (
                  <div key={x.need.id}>
                    <p className="font-semibold text-navy text-sm">{x.need.client_label}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {x.matches.slice(0, 4).map(m => (
                        <Link key={m.id} href={"/listing/" + m.id}
                              className="text-xs font-semibold bg-teal-light text-navy border border-teal rounded-full px-2.5 py-0.5 hover:bg-teal hover:text-white transition-colors">
                          {label(m)} | {formatPrice(m as any)}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* NEW LISTINGS */}
          {newListings.length > 0 && (
            <section className="card p-5">
              <h2 className="text-lg">New listings</h2>
              <div className="mt-3 divide-y divide-slate-100">
                {newListings.slice(0, 6).map(l => (
                  <Link key={l.id} href={"/listing/" + l.id} className="py-2 flex items-center justify-between gap-3 group">
                    <span className="text-sm font-semibold text-navy group-hover:text-teal truncate">{label(l)}</span>
                    <span className="text-sm text-slate-500 shrink-0">{formatPrice(l as any)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* NEW BUYERS */}
          {newBuyers.length > 0 && (
            <section className="card p-5">
              <h2 className="text-lg">New buyers on the board</h2>
              <div className="mt-3 divide-y divide-slate-100">
                {newBuyers.slice(0, 6).map(n => (
                  <div key={n.id} className="py-2">
                    <p className="text-sm font-semibold text-navy">{n.client_label}</p>
                    <p className="text-xs text-slate-500">
                      {[n.town !== "Any" ? n.town : "Any town", n.min_beds ? n.min_beds + "+ beds" : null,
                        n.max_price ? "under $" + Number(n.max_price).toLocaleString() : null].filter(Boolean).join(" | ")}
                      {" | "}{n.agent?.full_name ?? "agent"}
                    </p>
                  </div>
                ))}
              </div>
              <Link href="/agent/needs" className="text-sm font-semibold text-teal mt-3 inline-block">Open the board &rarr;</Link>
            </section>
          )}

          {/* TEAM INTEL */}
          {(answersForMe.length > 0 || newQuestions.length > 0) && (
            <section className="card p-5">
              <h2 className="text-lg flex items-center gap-2"><MessageCircle size={18} className="text-teal" /> Team intel</h2>
              {answersForMe.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-teal">ANSWERS TO YOUR QUESTIONS</p>
                  <div className="mt-1 divide-y divide-slate-100">
                    {answersForMe.slice(0, 4).map((r: any) => (
                      <div key={r.id} className="py-2">
                        <p className="text-sm font-semibold text-navy">{r.post?.location}</p>
                        <p className="text-sm text-slate-600">
                          {r.body} <span className="text-xs text-slate-400">({r.author?.full_name ?? "teammate"})</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {newQuestions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-teal">NEW QUESTIONS FROM THE TEAM</p>
                  <div className="mt-1 divide-y divide-slate-100">
                    {newQuestions.slice(0, 4).map((p: any) => (
                      <div key={p.id} className="py-2">
                        <p className="text-sm font-semibold text-navy">{p.location}</p>
                        <p className="text-xs text-slate-500">
                          {p.question ?? "Anyone know this one?"} | {p.author?.full_name ?? "teammate"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Link href="/agent/intel" className="text-sm font-semibold text-teal mt-3 inline-block">Open the board &rarr;</Link>
            </section>
          )}

          {/* LINK ACTIVITY */}
          {recentViews.length > 0 && (
            <section className="card p-5">
              <h2 className="text-lg">Clients opened your links</h2>
              <div className="mt-3 divide-y divide-slate-100">
                {recentViews.slice(0, 6).map((v, i) => (
                  <div key={i} className="py-2 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-navy truncate">{v.label}</span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {v.views} {v.views === 1 ? "view" : "views"} | {new Date(v.when!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/agent/links" className="text-sm font-semibold text-teal mt-3 inline-block">All links &rarr;</Link>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Tile({ href, n, l, icon, accent = false }: {
  href: string; n: number; l: string; icon: React.ReactNode; accent?: boolean;
}) {
  return (
    <Link href={href} className={"card p-4 text-center hover:shadow-md transition-shadow " + (accent && n > 0 ? "border-teal bg-teal-light" : "")}>
      <p className="text-3xl font-extrabold text-navy flex items-center justify-center gap-1.5">{n}</p>
      <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center justify-center gap-1">{icon} {l}</p>
    </Link>
  );
}
