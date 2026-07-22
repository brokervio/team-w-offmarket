"use client";
import { useState } from "react";
import { FileText, Home } from "lucide-react";

export default function DetailActions({ listingId, isNewConstruction }: { listingId: string; isNewConstruction: boolean }) {
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function request(lead_type: "details_request" | "plan_request") {
    setBusy(true);
    const r = await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, lead_type })
    });
    setBusy(false);
    if (r.ok) setSent(lead_type);
  }

  if (sent) {
    return (
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 p-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-bold text-navy">Done. A Team W agent will reach out within one business day.</p>
          <p className="text-sm text-slate-500 mt-1">Want it faster? <a href="tel:8454225238" className="text-teal font-semibold">Call 845-422-5238</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 p-3">
      <div className="max-w-4xl mx-auto flex gap-3">
        <button onClick={() => request("details_request")} disabled={busy} className="btn-primary flex-1">
          <Home size={18} /> Request Full Details
        </button>
        {isNewConstruction && (
          <button onClick={() => request("plan_request")} disabled={busy} className="btn-navy flex-1">
            <FileText size={18} /> Request Plans
          </button>
        )}
      </div>
    </div>
  );
}
