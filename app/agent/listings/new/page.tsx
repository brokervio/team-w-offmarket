import Header from "@/components/Header";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import ListingForm, { type TeamMember } from "@/components/ListingForm";

export const dynamic = "force-dynamic";

export default async function NewListing() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: team } = await supabase.from("profiles")
    .select("id, full_name").in("role", ["agent", "admin"]).order("full_name");

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/agent/listings" className="text-sm text-teal font-semibold">&larr; Back to listings</Link>
        <h1 className="text-2xl mt-2">Add Listing</h1>
        <ListingForm team={(team ?? []) as TeamMember[]} currentUserId={user!.id} />
      </main>
    </>
  );
}
