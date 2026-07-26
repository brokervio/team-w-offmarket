"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  return (
    <button onClick={signOut} title="Sign out"
            className="flex items-center gap-1.5 text-slate-500 hover:text-navy font-semibold">
      <LogOut size={16} />
      <span className="hidden sm:inline">Sign out</span>
    </button>
  );
}
