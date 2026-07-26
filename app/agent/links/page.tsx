import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabaseServer, supabaseAdmin } from "@/lib/supabase-server";
import LinkManager, { type ClientLink } from "@/components/LinkManager";

export const dynamic = "force-dynamic";

export default async function ClientLinks() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user!.id).single();
  const isAdmin = me?.role === "admin";

  const admin = supabaseAdmin();

  let sharesQ = admin.from("listing_shares")
    .select("id, token, show_address, view_count, last_viewed_at, created_at, revoked, listing:listing_id(public_name, exact_address), creator:created_by(full_name)")
    .order("created_at", { ascending: false }).limit(100);
  let colsQ = admin.from("listing_collections")
    .select("id, token, show_address, view_count, last_viewed_at, created_at, revoked, creator:created_by(full_name), items:listing_collection_items(listing_id)")
    .order("created_at", { ascending: false }).limit(100);
  if (!isAdmin) {
    sharesQ = sharesQ.eq("created_by", user!.id);
    colsQ = colsQ.eq("created_by", user!.id);
  }
  const [{ data: shares }, { data: cols }] = await Promise.all([sharesQ, colsQ]);

  const links: ClientLink[] = [
    ...(shares ?? []).map((s: any) => ({
      kind: "share" as const,
      id: s.id, token: s.token,
      label: s.listing?.exact_address || s.listing?.public_name || "Listing",
      creator: s.creator?.full_name ?? "Unknown",
      show_address: s.show_address, view_count: s.view_count,
      last_viewed_at: s.last_viewed_at, created_at: s.created_at, revoked: s.revoked
    })),
    ...(cols ?? []).map((c: any) => ({
      kind: "collection" as const,
      id: c.id, token: c.token,
      label: `${c.items?.length ?? 0} properties`,
      creator: c.creator?.full_name ?? "Unknown",
      show_address: c.show_address, view_count: c.view_count,
      last_viewed_at: c.last_viewed_at, created_at: c.created_at, revoked: c.revoked
    }))
  ].sort((a, b) => (b.created_at > a.created_at ? 1 : -1));

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Client Links</h1>
        <p className="text-sm text-slate-500 mt-1">
          Every link you have sent out, how many times it was opened, and when.
          {isAdmin ? " As admin you see the whole team's links." : ""}
        </p>
        <div className="mt-5 card">
          <LinkManager links={links} />
        </div>
      </main>
      <Footer />
    </>
  );
}
