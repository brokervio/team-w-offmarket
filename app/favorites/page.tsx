import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function Favorites() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: favs } = await supabase.from("favorites").select("listing_id").eq("user_id", user!.id);
  const ids = (favs ?? []).map(f => f.listing_id);
  const { data: listings } = ids.length
    ? await supabase.from("public_listings").select("*").in("id", ids)
    : { data: [] };

  return (
    <>
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6 min-h-[60vh]">
        <h1 className="text-2xl md:text-3xl">Saved Listings</h1>
        {listings && listings.length ? (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map(l => <ListingCard key={l.id} l={l as any} />)}
          </div>
        ) : (
          <p className="mt-12 text-center text-slate-500">Nothing saved yet. Heart a listing to track it here.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
