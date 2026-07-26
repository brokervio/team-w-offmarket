"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import { UserPlus } from "lucide-react";
import { townList, TYPE_LABEL } from "@/lib/access";

export default function NeedForm({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [f, setF] = useState({ client_label: "", town: "Any", property_type: "any", min_beds: "", max_price: "", notes: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));

  async function add() {
    setErr("");
    if (!f.client_label.trim()) { setErr("Give the buyer a label, like a first name and last initial."); return; }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("buyer_needs").insert({
      agent_id: currentUserId,
      client_label: f.client_label.trim(),
      town: f.town,
      property_type: f.property_type,
      min_beds: f.min_beds ? Number(f.min_beds) : null,
      max_price: f.max_price ? Number(f.max_price) : null,
      notes: f.notes || null
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setF({ client_label: "", town: "Any", property_type: "any", min_beds: "", max_price: "", notes: "" });
    router.refresh();
  }

  return (
    <div className="card p-5 mt-5">
      <p className="text-xs font-bold text-teal">ADD A BUYER</p>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="col-span-2 sm:col-span-1"><label className="label !text-xs">Buyer (label, not full name)</label>
          <input className="input !py-2 text-sm" value={f.client_label} onChange={e => set("client_label", e.target.value)}
                 placeholder="M. Cohen" /></div>
        <div><label className="label !text-xs">Town</label>
          <select className="input !py-2 text-sm" value={f.town} onChange={e => set("town", e.target.value)}>
            <option>Any</option>
            {townList().map(t => <option key={t}>{t}</option>)}
          </select></div>
        <div><label className="label !text-xs">Type</label>
          <select className="input !py-2 text-sm" value={f.property_type} onChange={e => set("property_type", e.target.value)}>
            <option value="any">Any</option>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></div>
        <div><label className="label !text-xs">Min beds</label>
          <input className="input !py-2 text-sm" type="number" value={f.min_beds} onChange={e => set("min_beds", e.target.value)} /></div>
        <div><label className="label !text-xs">Max price</label>
          <input className="input !py-2 text-sm" type="number" value={f.max_price} onChange={e => set("max_price", e.target.value)}
                 placeholder="900000" /></div>
        <div className="col-span-2 sm:col-span-3"><label className="label !text-xs">Notes</label>
          <input className="input !py-2 text-sm" value={f.notes} onChange={e => set("notes", e.target.value)}
                 placeholder="Needs a basement apartment, flexible on closing..." /></div>
      </div>
      {err && <p className="mt-2 text-sm text-red-600 font-semibold">{err}</p>}
      <button onClick={add} disabled={busy} className="btn-primary mt-3 !py-2 text-sm">
        <UserPlus size={15} /> {busy ? "Adding..." : "Add Buyer"}
      </button>
    </div>
  );
}
