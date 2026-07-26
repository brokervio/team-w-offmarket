"use client";
import { useState } from "react";
import ListingCard, { type ListingRow } from "./ListingCard";
import { Check, Link2, Mail, X } from "lucide-react";

// Browse grid with multi-select: pick several listings and generate
// one client link that shows them all.
export default function BrowseGrid({ listings }: { listings: ListingRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shareAddress, setShareAddress] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function createLink(): Promise<string | null> {
    setErr("");
    const r = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_ids: Array.from(selected), show_address: shareAddress })
    });
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setErr(body.error ?? "Could not create the link.");
      return null;
    }
    const { token } = await r.json();
    return `${window.location.origin}/share/c/${token}`;
  }

  async function copyLink() {
    setBusy(true);
    const url = await createLink();
    setBusy(false);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function emailLink() {
    setBusy(true);
    const url = await createLink();
    setBusy(false);
    if (!url) return;
    const subject = encodeURIComponent(`${selected.size} off-market opportunities for you`);
    const body = encodeURIComponent(
      `Hi,\n\nI put together ${selected.size} off-market properties I think you should see. They are not publicly listed:\n\n${url}\n\nThis link is private, please do not forward it. Call or reply and we can go through them together.\n\nTeam W Realty\n845-422-5238`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {listings.map(l => {
          const isSel = selected.has(l.id);
          const shareable = l.status !== "private_build";
          return (
            <div key={l.id} className={"relative rounded-card " + (isSel ? "ring-2 ring-teal" : "")}>
              {shareable && (
                <button type="button" title={isSel ? "Remove from client link" : "Add to client link"}
                        onClick={e => { e.preventDefault(); toggle(l.id); }}
                        className={"absolute top-3 right-3 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors " +
                          (isSel ? "bg-teal border-teal text-white" : "bg-white/90 border-slate-300 text-transparent hover:border-teal")}>
                  <Check size={15} />
                </button>
              )}
              <ListingCard l={l} />
            </div>
          );
        })}
      </div>
      {listings.length === 0 && (
        <p className="mt-12 text-center text-slate-500">
          Nothing matches those filters. Try widening the search, or add a listing.
        </p>
      )}

      {/* FLOATING SHARE BAR */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 inset-x-4 z-50 flex justify-center">
          <div className="card !shadow-lg border-teal p-4 w-full max-w-2xl">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <span className="badge-teal">{selected.size} selected</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={shareAddress} onChange={e => setShareAddress(e.target.checked)} />
                  <span>Include exact addresses</span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={copyLink} disabled={busy} className="btn-primary !py-2 !px-4 text-sm">
                  {copied ? <><Check size={15} /> Copied</> : <><Link2 size={15} /> Copy client link</>}
                </button>
                <button onClick={emailLink} disabled={busy} className="btn-secondary !py-2 !px-4 text-sm">
                  <Mail size={15} /> Email
                </button>
                <button onClick={() => setSelected(new Set())} title="Clear selection"
                        className="p-2 text-slate-400 hover:text-navy"><X size={17} /></button>
              </div>
            </div>
            {err && <p className="mt-2 text-xs text-red-600 font-semibold">{err}</p>}
            <p className="mt-2 text-xs text-slate-400">
              One private link with all selected properties. Addresses stay hidden unless you check the box.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
