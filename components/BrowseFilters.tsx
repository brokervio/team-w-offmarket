"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

type Opt = { value: string; label: string };

// Filter bar for /browse. Dropdowns search the moment they change.
// Typed fields (search, min, max price) search after a short pause,
// or right away on Enter. The bar stays mounted while results load,
// so the cursor never jumps out of a field.
export default function BrowseFilters({
  rockland, outside, types, statuses, builders
}: {
  rockland: string[]; outside: string[]; types: Opt[]; statuses: Opt[]; builders: Opt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const fmt = (v: string | null) => (v ? "$" + Number(v).toLocaleString() : "");
  const [min, setMin] = useState(fmt(params.get("min")));
  const [max, setMax] = useState(fmt(params.get("max")));
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function go(patch: Record<string, string>) {
    clearTimeout(timer.current);
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  // typed fields: wait until the agent stops typing
  function later(patch: Record<string, string>) {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go(patch), 600);
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  // "500" or "500k" = 500,000; "1.2m" = 1,200,000; plain numbers as typed.
  // Bare numbers under 10,000 are read as thousands.
  const money = (v: string) => {
    const t = v.toLowerCase().replace(/[$,\s]/g, "");
    const n = parseFloat(t);
    if (!t || isNaN(n)) return "";
    const val = t.endsWith("m") ? n * 1e6 : t.endsWith("k") || n < 10000 ? n * 1e3 : n;
    return String(Math.round(val));
  };
  const pretty = (v: string) => { const m = money(v); return m ? "$" + Number(m).toLocaleString() : ""; };
  const sel = "input !py-2 text-sm";
  const pick = (name: string) => ({
    name,
    value: params.get(name) ?? "",
    className: sel,
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => go({ [name]: e.target.value })
  });

  return (
    <form onSubmit={e => { e.preventDefault(); go({ q: q.trim(), min: money(min), max: money(max) }); }}
          className="mt-4 grid grid-cols-2 md:grid-cols-6 lg:grid-cols-12 gap-2 items-end bg-white py-3 z-30 border-b border-slate-100">
      <div className="col-span-2"><label className="label !mb-1">Search</label>
        <input value={q} className={sel} placeholder="Address, builder, agent, phone..."
               onChange={e => { setQ(e.target.value); later({ q: e.target.value.trim(), min: money(min), max: money(max) }); }} /></div>
      <div><label className="label !mb-1">FSBO</label>
        <select {...pick("fsbo")}>
          <option value="">All</option>
          <option value="only">FSBO only</option>
          <option value="hide">Hide FSBO</option>
        </select></div>
      <div><label className="label !mb-1">Town</label>
        <select {...pick("town")}>
          <option value="">All towns</option>
          <optgroup label="Rockland County">
            {rockland.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
          <optgroup label="Outside Rockland">
            {outside.map(t => <option key={t} value={t}>{t}</option>)}
          </optgroup>
        </select></div>
      <div><label className="label !mb-1">Type</label>
        <select {...pick("type")}>
          <option value="">All types</option>
          {types.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select></div>
      <div><label className="label !mb-1">Beds</label>
        <select {...pick("beds")}>
          <option value="">Any</option>{[2,3,4,5].map(b => <option key={b} value={b}>{b}+</option>)}
        </select></div>
      <div><label className="label !mb-1">Min price</label>
        <input value={min} inputMode="decimal" className={sel} placeholder="e.g. 500k"
               onBlur={e => setMin(pretty(e.target.value))}
               onChange={e => { setMin(e.target.value); later({ q: q.trim(), min: money(e.target.value), max: money(max) }); }} /></div>
      <div><label className="label !mb-1">Max price</label>
        <input value={max} inputMode="decimal" className={sel} placeholder="e.g. 700k"
               onBlur={e => setMax(pretty(e.target.value))}
               onChange={e => { setMax(e.target.value); later({ q: q.trim(), min: money(min), max: money(e.target.value) }); }} /></div>
      <div><label className="label !mb-1">Status</label>
        <select {...pick("status")}>
          <option value="">All except archived</option>
          {statuses.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select></div>
      <div><label className="label !mb-1">Listing</label>
        <select {...pick("rep")}>
          <option value="">All</option>
          <option value="open">Open listings</option>
          <option value="agent">Team W listing agent</option>
          <option value="outside">Other brokerage</option>
        </select></div>
      <div><label className="label !mb-1">Builder</label>
        <select {...pick("builder")}>
          <option value="">All builders</option>
          <option value="any">Any builder</option>
          {builders.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select></div>
      <button className="btn-primary !py-2 text-sm" disabled={pending}>
        <Search size={15} /> {pending ? "Searching" : "Search"}
      </button>
    </form>
  );
}
