import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";
import { daysRemaining } from "@/lib/access";
import { Clock } from "lucide-react";

export default async function Header() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: { role: string; access_expires_at: string | null } | null = null;
  if (user) {
    const { data } = await supabase.from("profiles")
      .select("role, access_expires_at").eq("id", user.id).single();
    profile = data;
  }
  const days = profile ? daysRemaining(profile.access_expires_at) : null;
  const isStaff = profile && ["agent","admin"].includes(profile.role);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        <Link href={user ? "/browse" : "/"} className="flex items-baseline gap-1 shrink-0">
          <span className="text-teal font-extrabold text-xl leading-none">team W</span>
          <span className="text-navy font-semibold text-sm">Off-Market</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-semibold">
          {user ? (
            <>
              {!isStaff && days !== null && (
                <span className="chip-access">
                  <Clock size={14} />
                  <span className="hidden sm:inline">{days} {days === 1 ? "day" : "days"} of access remaining</span>
                  <span className="sm:hidden">{days}d left</span>
                </span>
              )}
              <Link href="/browse" className="text-navy hover:text-teal">Browse</Link>
              <Link href="/favorites" className="text-navy hover:text-teal hidden sm:inline">Saved</Link>
              {isStaff && <Link href="/agent" className="text-teal">Agent</Link>}
              {profile?.role === "admin" && <Link href="/admin" className="text-teal hidden sm:inline">Admin</Link>}
            </>
          ) : (
            <>
              <Link href="/login" className="text-navy hover:text-teal">Sign In</Link>
              <Link href="/signup" className="btn-primary !py-2 !px-4 text-sm">Create Free Account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
