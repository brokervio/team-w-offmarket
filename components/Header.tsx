import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import SignOutButton from "./SignOutButton";
import { Plus } from "lucide-react";

export default async function Header() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: { role: string; full_name: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from("profiles")
      .select("role, full_name").eq("id", user.id).single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Team W Realty" className="h-9 w-auto" />
          <span className="hidden sm:inline text-[10px] font-bold tracking-widest uppercase text-slate-400 border border-slate-200 rounded-full px-2 py-0.5">Inventory</span>
        </Link>
        {user && (
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/browse" className="text-navy hover:text-teal">Browse</Link>
            <Link href="/agent/needs" className="text-navy hover:text-teal">Buyers</Link>
            <Link href="/agent/links" className="text-navy hover:text-teal hidden md:inline">Links</Link>
            <Link href="/agent/listings" className="text-navy hover:text-teal hidden sm:inline">Manage</Link>
            {profile?.role === "admin" && (
              <Link href="/admin" className="text-navy hover:text-teal">Admin</Link>
            )}
            <Link href="/profile" className="text-navy hover:text-teal hidden md:inline">My Profile</Link>
            <Link href="/agent/listings/new" className="btn-primary !py-2 !px-3 text-sm">
              <Plus size={16} /> <span className="hidden sm:inline">Add Listing</span>
            </Link>
            <SignOutButton />
          </nav>
        )}
      </div>
    </header>
  );
}
