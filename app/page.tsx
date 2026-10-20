import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { getBuyer, getPublicListings, inventoryCount } from "@/lib/public";
import { toCard } from "@/lib/public-format";
import PublicSite from "@/components/public/PublicSite";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Off-Market New Construction in Monsey | Team W Realty",
  description: "Private new construction and off-market homes in Monsey and Rockland County. Tell us what you need and see the homes builders don't post online.",
  openGraph: {
    title: "Monsey's new construction, before it's listed",
    description: "The private list of homes being built or sold quietly in Rockland. Verified buyers see it first.",
    images: ["/logo.png"]
  }
};

// Agents go to their dashboard. Everyone else gets the public buyer site.
export default async function Home({ searchParams }: { searchParams: Record<string, string> }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const [buyer, listings, total] = await Promise.all([getBuyer(), getPublicListings(), inventoryCount()]);
  const until = buyer?.access_expires_at
    ? new Date(buyer.access_expires_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })
    : "";

  return (
    <PublicSite
      total={total}
      listings={listings.map(toCard)}
      buyer={buyer ? { first: buyer.full_name.split(" ")[0], until } : null}
      openHome={searchParams.home ?? null}
    />
  );
}
