"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Ban, Eye, Check, RotateCcw } from "lucide-react";

export type ClientLink = {
  kind: "share" | "collection";
  id: string;
  token: string;
  label: string;          // listing name or "5 properties"
  creator: string;
  show_address: boolean;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  revoked: boolean;
};

function fmtWhen(iso: string | null) {
  if (!iso) return "never opened";
  const d = new Date(iso);
  return "last opened " + d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function LinkManager({ links }: { links: ClientLink[] }) {
  const router = useRouter();
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function url(l: ClientLink) {
    return `${window.location.origin}${l.kind === "share" ? "/share/" : "/share/c/"}${l.token}`;
  }

  async function copy(l: ClientLink) {
    await navigator.clipboard.writeText(url(l));
    setCopied(l.id);
    setTimeout(() => setCopied(null), 2000);
  }

  async function setRevoked(l: ClientLink, revoked: boolean) {
    if (revoked && !confirm("Turn this link off? The client will see a not-found page until you turn it back on.")) return;
    setBusy(l.id);
    await fetch("/api/links", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: l.kind, id: l.id, revoked })
    });
    setBusy(null);
    router.refresh();
  }

  if (!links.length) {
    return <p className="p-8 text-center text-sm text-slate-500">No client links yet. Share a listing, or select a few on Browse.</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {links.map(l => (
        <div key={l.kind + l.id} className={"p-4 flex items-center justify-between gap-3 " + (l.revoked ? "opacity-50" : "")}>
          <div className="min-w-0">
            <p className="font-semibold text-navy truncate">
              {l.kind === "collection" && <span className="badge-navy !text-[10px] mr-1.5">SET</span>}
              {l.label}
            </p>
            <p className="text-sm text-slate-500 truncate">
              <Eye size={13} className="inline -mt-0.5" /> {l.view_count} {l.view_count === 1 ? "view" : "views"}
              {" | "}{fmtWhen(l.last_viewed_at)}
              {" | "}{l.show_address ? "address shown" : "address hidden"}
              {" | by "}{l.creator}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {l.revoked ? (
              <button onClick={() => setRevoked(l, false)} disabled={busy === l.id}
                      className="btn-secondary !py-1.5 !px-3 text-xs" title="Turn back on">
                <RotateCcw size={13} /> Re-enable
              </button>
            ) : (
              <>
                <button onClick={() => copy(l)} className="btn-secondary !py-1.5 !px-3 text-xs" title="Copy link">
                  {copied === l.id ? <><Check size={13} /> Copied</> : <><Link2 size={13} /> Copy</>}
                </button>
                <button onClick={() => setRevoked(l, true)} disabled={busy === l.id}
                        className="p-2 text-slate-400 hover:text-red-600" title="Turn off this link">
                  <Ban size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
