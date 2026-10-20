"use client";
import { useState } from "react";
import { Check, Phone } from "lucide-react";

export default function RequestDetails({ listingId, already }: { listingId: string; already: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(already ? "done" : "idle");
  const [err, setErr] = useState("");

  async function go() {
    setState("busy"); setErr("");
    const r = await fetch("/api/public/request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId })
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(body.error ?? "That didn't go through."); setState("error"); return; }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="rounded-[14px] bg-teal-light border border-teal/30 p-5">
        <p className="font-semibold text-navy-dark flex items-center gap-2"><Check size={18} className="text-teal" /> Request sent</p>
        <p className="mt-1 text-sm text-slate-600">A Team W agent will text you the address and showing times today.</p>
        <a href="tel:8454225238" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-teal"><Phone size={14} /> Or call 845-422-5238</a>
      </div>
    );
  }
  return (
    <div>
      <button onClick={go} disabled={state === "busy"} className="btn-primary w-full !py-4 text-base">
        {state === "busy" ? "Sending..." : "Get the address and a showing"}
      </button>
      {err && <p className="mt-2 text-sm font-semibold text-red-600">{err}</p>}
      <a href="tel:8454225238" className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-teal"><Phone size={14} /> Call 845-422-5238</a>
    </div>
  );
}
