"use client";
import { useState } from "react";
import { Lock } from "lucide-react";

export default function Expired() {
  const [sent, setSent] = useState(false);
  async function reactivate() {
    const r = await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lead_type: "reactivation" })
    });
    if (r.ok) setSent(true);
  }
  return (
    <main className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="max-w-md text-center text-white">
        <div className="mx-auto w-16 h-16 rounded-full bg-white/10 flex items-center justify-center"><Lock size={28} /></div>
        <h1 className="text-white text-3xl mt-6">Your access has expired.</h1>
        <p className="mt-3 text-slate-300">
          Off-market inventory is only available to active members.
          Speak with a Team W agent to unlock another 4 weeks.
        </p>
        {sent ? (
          <p className="mt-8 font-bold text-teal-light">Request received. An agent will call you shortly.</p>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            <button onClick={reactivate} className="btn-primary">Request Reactivation</button>
            <a href="tel:8454225238" className="btn-secondary !border-white !text-white hover:!bg-white/10">Call 845-422-5238</a>
          </div>
        )}
      </div>
    </main>
  );
}
