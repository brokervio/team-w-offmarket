"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, Check, Lock } from "lucide-react";

type Answers = {
  beds_min: string; budget: string; area: string; timeline: string; financing: string;
  full_name: string; phone: string; email: string; consent: boolean;
};
const empty: Answers = {
  beds_min: "", budget: "", area: "", timeline: "", financing: "",
  full_name: "", phone: "", email: "", consent: false
};

const QUESTIONS: { key: keyof Answers; ask: string; options: { value: string; label: string }[] }[] = [
  { key: "beds_min", ask: "How many bedrooms do you need?",
    options: [{ value: "3", label: "3+" }, { value: "4", label: "4+" }, { value: "5", label: "5+" }, { value: "6", label: "6+" }, { value: "7", label: "7+" }] },
  { key: "budget", ask: "What's your budget?",
    options: ["Under $900K", "$900K to $1.2M", "$1.2M to $1.5M", "$1.5M to $2M", "Over $2M"].map(v => ({ value: v, label: v })) },
  { key: "area", ask: "Where do you want to live?",
    options: ["Monsey", "Spring Valley", "Airmont", "Suffern", "Anywhere in Rockland"].map(v => ({ value: v, label: v })) },
  { key: "timeline", ask: "When are you buying?",
    options: ["Now", "In 3 to 6 months", "In 6 to 12 months", "Just looking"].map(v => ({ value: v, label: v })) },
  { key: "financing", ask: "Where are you with financing?",
    options: ["Pre-approved", "Working on it", "Not yet", "Paying cash"].map(v => ({ value: v, label: v })) }
];
const CONTACT = QUESTIONS.length;      // step index for name/phone
const CODE = CONTACT + 1;              // text code
const DONE = CODE + 1;

export default function BuyerSheet({ open, onClose, context, homeId }: {
  open: boolean; onClose: () => void; context?: string | null; homeId?: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>(empty);
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ matches: number; first: string } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!open) return null;

  function choose(key: keyof Answers, value: string) {
    setA(prev => ({ ...prev, [key]: value }));
    setErr("");
    setStep(s => s + 1);
  }

  function utm() {
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"].forEach(k => { const v = p.get(k); if (v) out[k] = v; });
    if (document.referrer) out.referrer = document.referrer.slice(0, 200);
    return out;
  }

  async function submitContact() {
    setErr("");
    if (!a.full_name.trim()) { setErr("Enter your name."); return; }
    if (a.phone.replace(/\D/g, "").length < 10) { setErr("Enter a 10-digit cell number."); return; }
    if (!a.consent) { setErr("Check the box so we can text you."); return; }
    setBusy(true);
    const r = await fetch("/api/public/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, utm: utm() })
    });
    const body = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(body.error ?? "That didn't go through. Try again."); return; }
    if (body.step === "code") { setStep(CODE); return; }
    setResult({ matches: body.matches, first: body.first }); setStep(DONE);
  }

  async function submitCode() {
    setErr(""); setBusy(true);
    const r = await fetch("/api/public/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: a.phone, code })
    });
    const body = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(body.error ?? "That code didn't match."); return; }
    setResult({ matches: body.matches, first: body.first }); setStep(DONE);
  }

  async function resend() {
    setErr(""); setBusy(true);
    await fetch("/api/public/start", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...a, utm: utm() })
    });
    setBusy(false);
    setErr("New code sent.");
  }

  function finish() {
    onClose();
    if (homeId) router.push("/homes/" + homeId);
    else router.refresh();
  }

  const totalSteps = CODE;
  const progress = Math.min(step, totalSteps) / totalSteps;
  const q = QUESTIONS[step];

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Get access to off-market homes">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#0E2142]/60 sheet-fade" />
      <div ref={panel} tabIndex={-1}
           className="relative w-full sm:max-w-md bg-white rounded-t-[20px] sm:rounded-[20px] shadow-2xl sheet-rise outline-none max-h-[92vh] overflow-y-auto">
        <div className="h-1 bg-slate-100 rounded-t-[20px] overflow-hidden">
          <div className="h-full bg-teal transition-[width] duration-300" style={{ width: `${(step >= DONE ? 1 : progress) * 100}%` }} />
        </div>
        <div className="flex items-center justify-between px-5 pt-4">
          {step > 0 && step < DONE ? (
            <button onClick={() => { setErr(""); setStep(s => (s === CODE ? CONTACT : s - 1)); }}
                    className="p-2 -ml-2 text-slate-500 hover:text-navy" aria-label="Back"><ArrowLeft size={20} /></button>
          ) : <span />}
          <button onClick={onClose} className="p-2 -mr-2 text-slate-400 hover:text-navy" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="px-6 pb-7 pt-1">
          {step === 0 && (
            <p className="text-sm text-slate-500 mb-1">
              {context ? `Get the details on this ${context}.` : "Get the private list."} Takes 20 seconds.
            </p>
          )}

          {q && (
            <>
              <h2 className="font-display text-[26px] leading-tight text-navy-dark">{q.ask}</h2>
              <div className={"mt-5 grid gap-2.5 " + (q.key === "beds_min" ? "grid-cols-5" : "grid-cols-1")}>
                {q.options.map(o => {
                  const picked = a[q.key] === o.value;
                  return (
                    <button key={o.value} onClick={() => choose(q.key, o.value)}
                            className={"rounded-xl border-2 font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal " +
                              (q.key === "beds_min" ? "py-4 text-lg " : "py-3.5 px-4 text-left ") +
                              (picked ? "border-teal bg-teal-light text-navy-dark" : "border-slate-200 text-navy-dark hover:border-teal")}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === CONTACT && (
            <>
              <h2 className="font-display text-[26px] leading-tight text-navy-dark">Where should we send the homes?</h2>
              <p className="text-sm text-slate-500 mt-1.5">
                {a.beds_min}+ bedrooms, {a.budget}, {a.area === "Anywhere in Rockland" ? "anywhere in Rockland" : a.area}.
              </p>
              <div className="mt-5 space-y-3">
                <input className="input" autoComplete="name" placeholder="Full name" value={a.full_name}
                       onChange={e => setA({ ...a, full_name: e.target.value })} />
                <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="Cell phone" value={a.phone}
                       onChange={e => setA({ ...a, phone: e.target.value })} />
                <input className="input" type="email" autoComplete="email" placeholder="Email (optional)" value={a.email}
                       onChange={e => setA({ ...a, email: e.target.value })} />
                <label className="flex items-start gap-2.5 text-xs text-slate-500 leading-relaxed cursor-pointer">
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-teal shrink-0" checked={a.consent}
                         onChange={e => setA({ ...a, consent: e.target.checked })} />
                  <span>Team W Realty can call and text me at this number about homes, including by automated means.
                    Consent isn&apos;t a condition of buying anything. Msg and data rates may apply. Reply STOP to opt out.</span>
                </label>
              </div>
              {err && <p className="mt-3 text-sm font-semibold text-red-600">{err}</p>}
              <button onClick={submitContact} disabled={busy} className="btn-primary w-full mt-5 !py-3.5 text-base">
                {busy ? "Sending..." : "Show me the homes"}
              </button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400"><Lock size={12} /> We never share your number.</p>
            </>
          )}

          {step === CODE && (
            <>
              <h2 className="font-display text-[26px] leading-tight text-navy-dark">Enter the code we texted you</h2>
              <p className="text-sm text-slate-500 mt-1.5">Sent to {a.phone}. It confirms the number is yours.</p>
              <input className="input mt-5 text-center text-2xl tracking-[0.4em] font-semibold" inputMode="numeric"
                     autoComplete="one-time-code" maxLength={6} value={code} autoFocus
                     onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
                     onKeyDown={e => e.key === "Enter" && submitCode()} />
              {err && <p className={"mt-3 text-sm font-semibold " + (err === "New code sent." ? "text-teal" : "text-red-600")}>{err}</p>}
              <button onClick={submitCode} disabled={busy || code.length < 4} className="btn-primary w-full mt-5 !py-3.5 text-base">
                {busy ? "Checking..." : "Confirm"}
              </button>
              <button onClick={resend} disabled={busy} className="w-full mt-3 text-sm font-semibold text-teal hover:text-navy">Text me a new code</button>
            </>
          )}

          {step === DONE && result && (
            <div className="text-center py-2">
              <div className="mx-auto w-14 h-14 rounded-full bg-teal text-white flex items-center justify-center sheet-pop"><Check size={28} /></div>
              <h2 className="font-display text-[28px] leading-tight text-navy-dark mt-4">You&apos;re in, {result.first}.</h2>
              <p className="mt-2 text-slate-600">
                {result.matches > 0
                  ? <>{result.matches === 1 ? "One home" : `${result.matches} homes`} on our private list fit what you asked for. A Team W agent will text you the ones worth seeing, with addresses.</>
                  : <>Nothing on the list fits yet. You&apos;re on it now, and a Team W agent will text you when one comes in.</>}
              </p>
              <button onClick={finish} className="btn-primary w-full mt-6 !py-3.5 text-base">
                {homeId ? "See this home" : "Browse the homes"}
              </button>
              <p className="mt-3 text-xs text-slate-400">Can&apos;t wait? Call or text 845-422-5238.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
