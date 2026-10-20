import Header from "@/components/Header";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import ListingForm, { type TeamMember } from "@/components/ListingForm";
import { type Builder } from "@/lib/builders";

export const dynamic = "force-dynamic";

export default async function NewListing() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("profiles")
    .select("role").eq("id", user!.id).single();
  const { data: team } = await supabase.from("profiles")
    .select("id, full_name").in("role", ["agent", "admin"]).order("full_name");
  const { data: builders } = await supabase.from("builders")
    .select("id, name, contact_phone, notes").order("name");

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/agent/listings" className="text-sm text-teal font-semibold">&larr; Back to listings</Link>
        <h1 className="text-2xl mt-2">Add Listing</h1>
        <ListingForm team={(team ?? []) as TeamMember[]} builders={(builders ?? []) as Builder[]} currentUserId={user!.id}
                     isAdmin={me?.role === "admin"} aiEnabled={!!process.env.ANTHROPIC_API_KEY} />
      </main>
    </>
  );
}
