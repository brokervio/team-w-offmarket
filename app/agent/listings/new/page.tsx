import Header from "@/components/Header";
import Link from "next/link";
import ListingForm from "@/components/ListingForm";

export default function NewListing() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link href="/agent/listings" className="text-sm text-teal font-semibold">&larr; Back to listings</Link>
        <h1 className="text-2xl mt-2">Add Listing</h1>
        <ListingForm />
      </main>
    </>
  );
}
