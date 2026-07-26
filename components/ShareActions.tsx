"use client";
import { useState } from "react";
import Link from "next/link";
import { Link2, Mail, Check, Printer } from "lucide-react";

export default function ShareActions({ listingId, addressLine, publicName, town }: {
  listingId: string; addressLine: string; publicName: string; town: string;
}) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shareAddress, setShareAddress] = useState(false);

  async function getShareUrl(): Promise<string | null> {
    const r = await fetch("/api/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, show_address: shareAddress })
    });
    if (!r.ok) return null;
    const { token } = await r.json();
    return `${window.location.origin}/share/${token}`;
  }

  async function copyLink() {
    setBusy(true);
    const url = await getShareUrl();
    setBusy(false);
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function emailClient() {
    setBusy(true);
    const url = await getShareUrl();
    setBusy(false);
    if (!url) return;
    const what = shareAddress ? addressLine : `${publicName} in ${town}`;
    const subject = encodeURIComponent(`Off-market opportunity in ${town}`);
    const body = encodeURIComponent(
      `Hi,\n\nI wanted to show you an off-market property that is not publicly listed:\n\n${what}\n\nFull details and photos here:\n${url}\n\nThis link is private, please do not forward it. Call or reply if you want to see it.\n\nTeam W Realty\n845-422-5238`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="card p-5">
      <p className="text-xs font-bold text-teal">SHARE WITH A CLIENT</p>
      <p className="text-xs text-slate-500 mt-1">
        The link shows this one listing only. No login, no access to the rest of the inventory.
      </p>
      <label className="mt-3 flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
        <input type="checkbox" className="mt-0.5" checked={shareAddress}
               onChange={e => setShareAddress(e.target.checked)} />
        <span><span className="font-semibold text-navy">Include the exact address.</span> Off by default. The client sees only the town and area unless you check this.</span>
      </label>
      <div className="mt-3 space-y-2">
        <button onClick={copyLink} disabled={busy} className="btn-secondary w-full !py-2 text-sm">
          {copied ? <><Check size={15} /> Link copied</> : <><Link2 size={15} /> Copy client link</>}
        </button>
        <button onClick={emailClient} disabled={busy} className="btn-secondary w-full !py-2 text-sm">
          <Mail size={15} /> Email to a client
        </button>
        <Link href={`/listing/${listingId}/flyer${shareAddress ? "" : "?noaddress=1"}`}
              className="btn-secondary w-full !py-2 text-sm">
          <Printer size={15} /> Print flyer
        </Link>
      </div>
    </div>
  );
}
