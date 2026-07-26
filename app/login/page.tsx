"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-client";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setBusy(true); setErr("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr("Wrong email or password."); return; }
    router.push(params.get("next") ?? "/dashboard");
  }

  return (
    <div className="card w-full max-w-md p-8">
      <Link href="/" className="flex justify-center mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Team W Realty" className="h-16 w-auto" />
      </Link>
      <h1 className="text-2xl text-center mb-1">Team sign in</h1>
      <p className="text-center text-sm text-slate-500 mb-6">Internal inventory portal for Team W agents.</p>
      <div className="space-y-4">
        <div><label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div><label className="label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                 onKeyDown={e => e.key === "Enter" && signIn()} /></div>
        {err && <p className="text-sm text-red-600 font-semibold">{err}</p>}
        <button onClick={signIn} disabled={busy} className="btn-primary w-full">{busy ? "Signing in..." : "Sign In"}</button>
        <p className="text-center text-xs text-slate-400">Need an account? Ask your team admin.</p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <Suspense><LoginForm /></Suspense>
    </main>
  );
}
