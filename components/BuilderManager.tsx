"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-client";
import { phoneDigits, type Builder } from "@/lib/builders";
import { Pencil, Plus, Search, Check, X } from "lucide-react";

type Draft = { name: string; contact_phone: string; contact_email: string; notes: string };
const blank: Draft = { name: "", contact_phone: "", contact_email: "", notes: "" };
const toDraft = (b: Builder): Draft => ({
  name: b.name, contact_phone: b.contact_phone ?? "", contact_email: b.contact_email ?? "", notes: b.notes ?? ""
});

export default function BuilderManager({ initial, counts }: { initial: Builder[]; counts: Record<string, number> }) {
  const [builders, setBuilders] = useState<Builder[]>(initial);
  const [q, setQ] = useState("");
  const [editId, setEditId] = useState<string | null>(null); // "new" for the add form
  const [d, setD] = useState<Draft>(blank);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const shown = builders.filter(b => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    const digits = s.replace(/\D/g, "");
    return [b.name, b.contact_email, b.notes].some(v => (v ?? "").toLowerCase().includes(s)) ||
      (digits.length >= 3 && phoneDigits(b.contact_phone).includes(digits));
  });

  function start(id: string | null, b?: Builder) {
    setErr(""); setEditId(id); setD(b ? toDraft(b) : blank);
  }

  async function save() {
    setErr("");
    if (!d.name.trim()) { setErr("Name is required."); return; }
    const digits = phoneDigits(d.contact_phone);
    const dup = builders.find(b => b.id !== editId && (
      b.name.trim().toLowerCase() === d.name.trim().toLowerCase() ||
      (digits.length === 10 && phoneDigits(b.contact_phone) === digits)));
    if (dup) { setErr(`Matches ${dup.name}, who is already on the list.`); return; }
    const row = {
      name: d.name.trim(), contact_phone: d.contact_phone.trim() || null,
      contact_email: d.contact_email.trim() || null, notes: d.notes.trim() || null
    };
    setBusy(true);
    const sb = supabaseBrowser();
    const res = editId === "new"
      ? await sb.from("builders").insert(row).select("id, name, contact_phone, contact_email, notes").single()
      : await sb.from("builders").update(row).eq("id", editId!).select("id, name, contact_phone, contact_email, notes").single();
    setBusy(false);
    if (res.error || !res.data) { setErr(res.error?.message ?? "Could not save."); return; }
    const saved = res.data as Builder;
    setBuilders(prev => [...prev.filter(b => b.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
    setEditId(null);
  }

  const form = (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <input className="input" placeholder="Name" value={d.name} onChange={e => setD({ ...d, name: e.target.value })} />
        <input className="input" type="tel" placeholder="Phone" value={d.contact_phone} onChange={e => setD({ ...d, contact_phone: e.target.value })} />
        <input className="input" type="email" placeholder="Email" value={d.contact_email} onChange={e => setD({ ...d, contact_email: e.target.value })} />
      </div>
      <input className="input" placeholder="Notes (company, areas they build, do not text...)" value={d.notes}
             onChange={e => setD({ ...d, notes: e.target.value })} />
      {err && <p className="text-xs text-red-600 font-semibold">{err}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={busy} className="btn-primary !py-2 !px-4 text-sm">
          <Check size={14} /> {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={() => setEditId(null)} className="btn-secondary !py-2 !px-4 text-sm">
          <X size={14} /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="mt-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input !pl-9" placeholder="Search name, phone, email..." value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <button type="button" onClick={() => start("new")} className="btn-primary !py-2">
          <Plus size={16} /> Add Builder
        </button>
      </div>

      {editId === "new" && (
        <div className="mt-4 card p-5 border-teal">
          <p className="text-xs font-bold text-teal mb-3">NEW BUILDER</p>
          {form}
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500 font-semibold">{shown.length} of {builders.length} builders</p>
      <div className="mt-2 card divide-y divide-slate-100">
        {shown.map(b => (
          <div key={b.id} className="p-4">
            {editId === b.id ? form : (
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy truncate">{b.name}</p>
                  <p className="text-sm text-slate-600">
                    {b.contact_phone
                      ? <a href={"tel:" + b.contact_phone} className="text-teal font-semibold">{b.contact_phone}</a>
                      : <span className="text-slate-400">No phone</span>}
                    {b.contact_email && <> | <a href={"mailto:" + b.contact_email} className="text-teal">{b.contact_email}</a></>}
                  </p>
                  {b.notes && (
                    <p className={"text-xs mt-1 " + (/opted out|STOP|do not/i.test(b.notes) ? "text-red-600 font-semibold" : "text-slate-500")}>
                      {b.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link href={"/browse?builder=" + b.id} className="badge-teal whitespace-nowrap">
                    {counts[b.id] ?? 0} listing{(counts[b.id] ?? 0) === 1 ? "" : "s"}
                  </Link>
                  <button type="button" onClick={() => start(b.id, b)} title="Edit"
                          className="btn-secondary !py-1.5 !px-3 text-sm"><Pencil size={14} /> Edit</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {!shown.length && <p className="p-8 text-center text-sm text-slate-500">No builders match that search.</p>}
      </div>
    </>
  );
}
