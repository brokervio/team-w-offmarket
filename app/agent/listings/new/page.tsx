"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import Link from "next/link";
import { Lock } from "lucide-react";

const TOWNS = ["Monsey","Spring Valley","Airmont","Suffern","Nanuet","New Hempstead","Pomona","Wesley Hills","New Square","Monroe","Kiryas Joel","Monticello","Chester","Other"];

export default function NewListing() {
  const router = useRouter();
  const [f, setF] = useState<any>({
    exact_address: "", public_name: "", town: "Monsey", neighborhood_label: "",
    property_type: "new_construction", status: "draft", price: "", price_max: "",
    price_display: "call", beds: "", baths: "", sqft: "", delivery_date: "",
    description_public: "", cobroke_terms: "", notes_internal: "", source: ""
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: any) => setF({ ...f, [k]: v });

  function suggestPublicName() {
    const street = f.exact_address.replace(/^\s*\d+\s*/, "").split(",")[0].trim();
    const type = f.property_type === "new_construction" ? "New Construction" :
                 f.property_type === "multi_family" ? "Multi-Family" :
                 f.property_type === "land" ? "Land" : "Off-Market Home";
    if (street) set("public_name", `${type}, ${street} Area`);
  }

  async function save(status: string) {
    setErr(""); setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("listings").insert({
      ...f,
      status,
      price: f.price ? Number(f.price) : null,
      price_max: f.price_max ? Number(f.price_max) : null,
      beds: f.beds ? Number(f.beds) : null,
      baths: f.baths ? Number(f.baths) : null,
      sqft: f.sqft ? Number(f.sqft) : null,
      delivery_date: f.delivery_date || null
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push("/agent/listings");
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/agent/listings" className="text-sm text-teal font-semibold">&larr; Back to listings</Link>
      <h1 className="text-2xl mt-2">New Listing</h1>

      {/* INTERNAL SECTION */}
      <section className="mt-5 card p-5 border-navy">
        <p className="flex items-center gap-1.5 text-xs font-bold text-white bg-navy-dark w-fit px-2.5 py-1 rounded-full">
          <Lock size={12} /> INTERNAL: agents and admins only
        </p>
        <div className="mt-4 space-y-4">
          <div><label className="label">Exact address</label>
            <input className="input" value={f.exact_address} onChange={e => set("exact_address", e.target.value)}
                   onBlur={suggestPublicName} placeholder="45 Summit Avenue, Monticello, NY" /></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="label">Co-broke / commission terms</label>
              <input className="input" value={f.cobroke_terms} onChange={e => set("cobroke_terms", e.target.value)} /></div>
            <div><label className="label">Source</label>
              <input className="input" value={f.source} onChange={e => set("source", e.target.value)} placeholder="Builder direct, referral..." /></div>
          </div>
          <div><label className="label">Internal notes</label>
            <textarea className="input" rows={2} value={f.notes_internal} onChange={e => set("notes_internal", e.target.value)} /></div>
        </div>
      </section>

      {/* PUBLIC SECTION */}
      <section className="mt-4 card p-5">
        <p className="text-xs font-bold text-teal">PUBLIC: what prospects see</p>
        <div className="mt-4 space-y-4">
          <div><label className="label">Public display name (no house numbers)</label>
            <input className="input" value={f.public_name} onChange={e => set("public_name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Town</label>
              <select className="input" value={f.town} onChange={e => set("town", e.target.value)}>
                {TOWNS.map(t => <option key={t}>{t}</option>)}
              </select></div>
            <div><label className="label">Area label</label>
              <input className="input" value={f.neighborhood_label} onChange={e => set("neighborhood_label", e.target.value)} placeholder="Summit Ave corridor" /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><label className="label">Type</label>
              <select className="input" value={f.property_type} onChange={e => set("property_type", e.target.value)}>
                <option value="new_construction">New Construction</option>
                <option value="off_market_resale">Off-Market Resale</option>
                <option value="multi_family">Multi-Family</option>
                <option value="land">Land</option>
              </select></div>
            <div><label className="label">Beds</label><input className="input" type="number" value={f.beds} onChange={e => set("beds", e.target.value)} /></div>
            <div><label className="label">Baths</label><input className="input" type="number" step="0.5" value={f.baths} onChange={e => set("baths", e.target.value)} /></div>
            <div><label className="label">Sqft</label><input className="input" type="number" value={f.sqft} onChange={e => set("sqft", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><label className="label">Price display</label>
              <select className="input" value={f.price_display} onChange={e => set("price_display", e.target.value)}>
                <option value="call">Price on request</option>
                <option value="exact">Exact price</option>
                <option value="range">Range</option>
              </select></div>
            <div><label className="label">Price</label><input className="input" type="number" value={f.price} onChange={e => set("price", e.target.value)} /></div>
            <div><label className="label">Price max</label><input className="input" type="number" value={f.price_max} onChange={e => set("price_max", e.target.value)} /></div>
            <div><label className="label">Delivery date</label><input className="input" type="date" value={f.delivery_date} onChange={e => set("delivery_date", e.target.value)} /></div>
          </div>
          <div><label className="label">Public description (never include the address)</label>
            <textarea className="input" rows={4} value={f.description_public} onChange={e => set("description_public", e.target.value)} /></div>
        </div>
      </section>

      {err && <p className="mt-4 text-sm text-red-600 font-semibold">{err}</p>}
      <div className="mt-5 flex gap-3 pb-10">
        <button onClick={() => save("draft")} disabled={busy} className="btn-secondary flex-1">Save Draft</button>
        <button onClick={() => save("pending")} disabled={busy} className="btn-primary flex-1">Submit for Approval</button>
      </div>
    </main>
  );
}
