"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-client";

export default function Signup() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "otp">("form");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", tcpa: false });
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const normPhone = () => {
    const d = form.phone.replace(/\D/g, "");
    return d.length === 10 ? "+1" + d : "+" + d;
  };

  async function sendCode() {
    setErr("");
    if (!form.name || !form.email || !form.phone || form.password.length < 8) {
      setErr("Fill in every field. Password needs 8+ characters."); return;
    }
    if (!form.tcpa) { setErr("Please agree to receive calls and texts to continue."); return; }
    setBusy(true);
    const r = await fetch("/api/auth/send-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normPhone() })
    });
    setBusy(false);
    if (!r.ok) { setErr("Could not send the code. Check the phone number."); return; }
    setStep("otp");
  }

  async function verifyAndCreate() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/auth/verify-otp", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normPhone(), code, email: form.email, password: form.password, full_name: form.name })
    });
    if (!r.ok) { setBusy(false); setErr("That code did not match. Try again."); return; }
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push("/browse?welcome=1");
  }

  return (
    <main className="min-h-screen bg-surface flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md p-8">
        <Link href="/" className="flex items-baseline gap-1 justify-center mb-6">
          <span className="text-teal font-extrabold text-2xl">team W</span>
          <span className="text-navy font-semibold">Off-Market</span>
        </Link>

        {step === "form" ? (
          <>
            <h1 className="text-2xl text-center">Create your free account</h1>
            <p className="text-center text-sm text-slate-500 mt-1 mb-6">14 days of full access starts now.</p>
            <div className="space-y-4">
              <div><label className="label">Full name</label>
                <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
              <div><label className="label">Mobile phone</label>
                <input className="input" type="tel" placeholder="845-555-1234" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="label">Password</label>
                <input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>
              <label className="flex items-start gap-2 text-xs text-slate-600">
                <input type="checkbox" className="mt-0.5" checked={form.tcpa} onChange={e => setForm({...form, tcpa: e.target.checked})} />
                <span>I agree to receive calls and text messages from Team W Realty about properties and my account.
                Message and data rates may apply. Reply STOP to opt out.</span>
              </label>
              {err && <p className="text-sm text-red-600 font-semibold">{err}</p>}
              <button onClick={sendCode} disabled={busy} className="btn-primary w-full">
                {busy ? "Sending code..." : "Verify My Phone"}
              </button>
              <p className="text-center text-sm">Already a member? <Link href="/login" className="text-teal font-semibold">Sign in</Link></p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl text-center">Enter your code</h1>
            <p className="text-center text-sm text-slate-500 mt-1 mb-6">We texted a 6-digit code to {form.phone}.</p>
            <input className="input text-center text-2xl tracking-[0.5em]" maxLength={6} inputMode="numeric"
                   value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} />
            {err && <p className="text-sm text-red-600 font-semibold mt-3">{err}</p>}
            <button onClick={verifyAndCreate} disabled={busy || code.length !== 6} className="btn-primary w-full mt-4">
              {busy ? "Verifying..." : "Unlock My Access"}
            </button>
            <button onClick={() => setStep("form")} className="w-full text-sm text-slate-500 mt-3">Back</button>
          </>
        )}
      </div>
    </main>
  );
}
