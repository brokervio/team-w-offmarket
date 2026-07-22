import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ListingCard from "@/components/ListingCard";
import { supabaseAdmin } from "@/lib/supabase-server";
import { KeyRound, Search, PhoneCall } from "lucide-react";

export const revalidate = 300;

export default async function Landing() {
  const admin = supabaseAdmin();
  const { data: teasers } = await admin
    .from("public_listings")
    .select("id,status,public_name,town,neighborhood_label,price,price_max,price_display,beds,baths,sqft,property_type,delivery_date")
    .order("published_at", { ascending: false })
    .limit(6);

  return (
    <>
      <Header />
      <main>
        {/* HERO */}
        <section className="relative bg-navy text-white">
          <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-teal-dark opacity-95" />
          <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-28 text-center">
            <p className="text-teal-light font-semibold tracking-widest uppercase text-sm mb-4">
              Rockland and Orange County
            </p>
            <h1 className="text-white text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl mx-auto">
              The Inventory You Won&apos;t Find on Zillow.
            </h1>
            <p className="mt-5 text-lg md:text-xl text-slate-200 max-w-2xl mx-auto">
              Off-market homes and new construction, before they hit the market.
              Free account required. Access is limited.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/signup" className="btn-primary text-lg !px-8">Create Free Account</Link>
              <Link href="/login" className="btn-secondary !border-white !text-white hover:!bg-white/10 text-lg !px-8">Sign In</Link>
            </div>
            <p className="mt-4 text-sm text-slate-300">14 days of full access. No credit card. Ever.</p>
          </div>
        </section>

        {/* TEASER GRID */}
        <section className="max-w-6xl mx-auto px-4 py-14">
          <h2 className="text-2xl md:text-3xl text-center">Inside the Vault Right Now</h2>
          <p className="text-center text-slate-500 mt-2">A sample of current off-market inventory. Details unlock with a free account.</p>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(teasers ?? []).map(l => <ListingCard key={l.id} l={l as any} locked />)}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="bg-surface">
          <div className="max-w-6xl mx-auto px-4 py-14">
            <h2 className="text-2xl md:text-3xl text-center">How It Works</h2>
            <div className="mt-8 grid md:grid-cols-3 gap-6">
              {[
                { icon: KeyRound, t: "Sign up free", d: "Verify your phone and get 14 days of full access to every off-market listing." },
                { icon: Search, t: "Search the hidden market", d: "New construction and quiet deals across Rockland and Orange County. Filter by town, price, beds, and delivery date." },
                { icon: PhoneCall, t: "Talk to an agent for the address", d: "Exact locations, plans, and pricing come from your Team W agent. One conversation extends your access another 4 weeks." }
              ].map(({ icon: Icon, t, d }) => (
                <div key={t} className="card p-6 text-center">
                  <div className="mx-auto w-12 h-12 rounded-full bg-teal-light text-teal flex items-center justify-center"><Icon /></div>
                  <h3 className="mt-4 text-lg">{t}</h3>
                  <p className="mt-2 text-sm text-slate-600">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="max-w-6xl mx-auto px-4 py-14 text-center">
          <h2 className="text-2xl md:text-3xl">Why Sellers and Builders Trust Team W</h2>
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[["156","Homes Sold"],["5.0","Zillow Rating"],["$50M+","Sales Volume"],["Top 2%","Rockland County"]].map(([n,l]) => (
              <div key={l}>
                <p className="text-3xl md:text-4xl font-extrabold text-teal">{n}</p>
                <p className="text-sm font-semibold text-navy mt-1">{l}</p>
              </div>
            ))}
          </div>
          <Link href="/signup" className="btn-navy mt-10 text-lg !px-10">Unlock the Inventory</Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
