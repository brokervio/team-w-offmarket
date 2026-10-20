import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabaseServer } from "@/lib/supabase-server";
import BuilderManager from "@/components/BuilderManager";
import { listingMatchesBuilder, type Builder } from "@/lib/builders";

export const dynamic = "force-dynamic";

export default async function Builders() {
  const supabase = supabaseServer();
  const { data: rows } = await supabase.from("builders")
    .select("id, name, contact_phone, contact_email, notes").order("name");
  const builders = (rows ?? []) as Builder[];

  const { data: listings } = await supabase.from("listings")
    .select("builder_id, seller_phone, seller_phone_digits, source").neq("status", "archived");
  const counts: Record<string, number> = {};
  for (const b of builders) {
    counts[b.id] = (listings ?? []).filter(l => listingMatchesBuilder(l, b)).length;
  }

  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6 min-h-[70vh]">
        <h1 className="text-2xl md:text-3xl">Builders</h1>
        <p className="text-sm text-slate-500 mt-1">
          Internal list. Shows in the Builder dropdown on every listing and the Builder filter on Browse.
        </p>
        <BuilderManager initial={builders} counts={counts} />
      </main>
      <Footer />
    </>
  );
}
