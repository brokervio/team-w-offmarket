"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import { compressImage } from "@/lib/compress";
import { Lock, Upload, Trash2, ImagePlus, UserCheck, Sparkles, FileText, Paperclip } from "lucide-react";

const TOWNS = ["Monsey","Spring Valley","Airmont","Suffern","Nanuet","New Hempstead","Pomona","Wesley Hills","New Square","Monroe","Kiryas Joel","Monticello","Chester","Other"];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft (only visible in Manage)" },
  { value: "coming_soon", label: "Coming Soon" },
  { value: "available", label: "Available" },
  { value: "in_contract", label: "In Contract" },
  { value: "sold", label: "Sold" },
  { value: "private_build", label: "Private build (not for sale)" },
  { value: "archived", label: "Archived (hidden)" }
];

export type ExistingPhoto = { id: string; url: string };
export type ExistingDoc = { id: string; url: string; name: string };
export type TeamMember = { id: string; full_name: string | null };

export default function ListingForm({
  listingId, initial, existingPhotos = [], existingDocs = [], team, currentUserId, isAdmin = false, aiEnabled = false
}: {
  listingId?: string;
  initial?: Record<string, any>;
  existingPhotos?: ExistingPhoto[];
  existingDocs?: ExistingDoc[];
  team: TeamMember[];
  currentUserId: string;
  isAdmin?: boolean;
  aiEnabled?: boolean;
}) {
  // Admins assign any agent as the listing agent. Agents can only
  // assign themselves (or whoever an admin already assigned).
  const repChoices = isAdmin
    ? team
    : team.filter(m => m.id === currentUserId || m.id === initial?.listing_agent_id);
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const addressInput = useRef<HTMLInputElement>(null);
  const [f, setF] = useState<Record<string, any>>({
    exact_address: initial?.exact_address ?? "",
    town: initial?.town ?? "Monsey",
    property_type: initial?.property_type ?? "new_construction",
    status: initial?.status ?? "available",
    delivery_date: initial?.delivery_date ?? "",
    price_display: initial?.price_display ?? "exact",
    price: initial?.price ?? "",
    price_max: initial?.price_max ?? "",
    beds: initial?.beds ?? "",
    baths: initial?.baths ?? "",
    sqft: initial?.sqft ?? "",
    lot_desc: initial?.lot_desc ?? "",
    // representation
    listing_rep: initial?.is_open_listing ? "open" : (initial?.listing_agent_id ?? currentUserId),
    commission: initial?.commission ?? "",
    seller_phone: initial?.seller_phone ?? "",
    // reference
    mls_number: initial?.mls_number ?? "",
    photos_url: initial?.photos_url ?? "",
    // marketing
    public_name: initial?.public_name ?? "",
    neighborhood_label: initial?.neighborhood_label ?? "",
    description_public: initial?.description_public ?? "",
    // internal
    cobroke_terms: initial?.cobroke_terms ?? "",
    source: initial?.source ?? "",
    notes_internal: initial?.notes_internal ?? ""
  });
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [photos, setPhotos] = useState<ExistingPhoto[]>(existingPhotos);
  const [newDocs, setNewDocs] = useState<File[]>([]);
  const [docs, setDocs] = useState<ExistingDoc[]>(existingDocs);
  const docInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState("");
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiErr, setAiErr] = useState("");
  const set = (k: string, v: any) => setF(prev => ({ ...prev, [k]: v }));

  async function generateDescription() {
    setAiErr(""); setAiBusy(true);
    // The exact address is intentionally NOT sent to the AI.
    const r = await fetch("/api/generate-description", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_type: f.property_type, town: f.town, neighborhood_label: f.neighborhood_label,
        beds: f.beds, baths: f.baths, sqft: f.sqft, lot_desc: f.lot_desc,
        delivery_date: f.delivery_date, price: f.price_display === "exact" ? f.price : null,
        status: f.status
      })
    });
    setAiBusy(false);
    const body = await r.json().catch(() => ({}));
    if (!r.ok) { setAiErr(body.error ?? "Could not generate a description."); return; }
    set("description_public", body.description);
  }

  // Google Places autocomplete lights up automatically once a real
  // NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is configured.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!key || key.includes("XXXX")) return;
    const w = window as any;
    const attach = () => {
      if (!addressInput.current || !w.google?.maps?.places) return;
      const ac = new w.google.maps.places.Autocomplete(addressInput.current, {
        fields: ["formatted_address"],
        componentRestrictions: { country: "us" }
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place?.formatted_address) set("exact_address", place.formatted_address);
      });
    };
    if (w.google?.maps?.places) { attach(); return; }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    s.async = true;
    s.onload = attach;
    document.head.appendChild(s);
  }, []);

  function suggestPublicName() {
    if (f.public_name) return;
    const street = f.exact_address.replace(/^\s*\d+\s*/, "").split(",")[0].trim();
    const type = f.property_type === "new_construction" ? "New Construction" :
                 f.property_type === "multi_family" ? "Multi-Family" :
                 f.property_type === "land" ? "Land" : "Off-Market Home";
    if (street) set("public_name", `${type}, ${street} Area`);
  }

  function pickFiles(picked: FileList | File[] | null) {
    if (!picked) return;
    const arr = Array.from(picked).filter(file => file.type.startsWith("image/"));
    if (!arr.length) return;
    setFiles(prev => [...prev, ...arr]);
    setPreviews(prev => [...prev, ...arr.map(file => URL.createObjectURL(file))]);
  }

  function removeNewFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  }

  async function removeExistingPhoto(id: string) {
    const r = await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_id: id })
    });
    if (r.ok) setPhotos(prev => prev.filter(p => p.id !== id));
  }

  async function removeExistingDoc(id: string) {
    const r = await fetch("/api/upload", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_id: id })
    });
    if (r.ok) setDocs(prev => prev.filter(d => d.id !== id));
  }

  async function save() {
    setErr("");
    if (!f.exact_address.trim()) { setErr("Enter the property address."); return; }
    setBusy(true);

    const fallbackName = () => {
      const type = f.property_type === "new_construction" ? "New Construction" :
                   f.property_type === "multi_family" ? "Multi-Family" :
                   f.property_type === "land" ? "Land" : "Off-Market Home";
      return `${type} in ${f.town}`;
    };

    const open = f.listing_rep === "open";
    const payload: Record<string, any> = {
      exact_address: f.exact_address.trim(),
      town: f.town,
      property_type: f.property_type,
      status: f.status,
      delivery_date: f.delivery_date || null,
      price_display: f.price_display,
      price: f.price ? Number(f.price) : null,
      price_max: f.price_max ? Number(f.price_max) : null,
      beds: f.beds ? Number(f.beds) : null,
      baths: f.baths ? Number(f.baths) : null,
      sqft: f.sqft ? Number(f.sqft) : null,
      lot_desc: f.lot_desc || null,
      is_open_listing: open,
      listing_agent_id: open ? null : f.listing_rep,
      commission: open ? null : (f.commission || null),
      seller_phone: open ? (f.seller_phone || null) : null,
      mls_number: f.mls_number || null,
      photos_url: f.photos_url || null,
      public_name: f.public_name.trim() || fallbackName(),
      neighborhood_label: f.neighborhood_label || null,
      description_public: f.description_public || null,
      cobroke_terms: f.cobroke_terms || null,
      source: f.source || null,
      notes_internal: f.notes_internal || null
    };

    const supabase = supabaseBrowser();
    let id = listingId;
    if (id) {
      const { error } = await supabase.from("listings").update(payload).eq("id", id);
      if (error) { setBusy(false); setErr(friendly(error.message)); return; }
    } else {
      payload.created_by = currentUserId;
      const { data, error } = await supabase.from("listings").insert(payload).select("id").single();
      if (error || !data) { setBusy(false); setErr(friendly(error?.message ?? "Could not save.")); return; }
      id = data.id;
    }

    for (let i = 0; i < files.length; i++) {
      setProgress(`Uploading photo ${i + 1} of ${files.length}...`);
      // shrink big renderings and phone photos to web size before upload
      const compressed = await compressImage(files[i]);
      const fd = new FormData();
      fd.append("file", compressed);
      fd.append("listing_id", id!);
      fd.append("sort_order", String(photos.length + i));
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      if (!r.ok) {
        setBusy(false); setProgress("");
        setErr(r.status === 413
          ? `Photo ${i + 1} is too large even after compression. The listing was saved; try exporting the image as JPG and re-adding it.`
          : `Photo ${i + 1} failed to upload. The listing itself was saved. Open it again to retry the photos.`);
        return;
      }
    }

    for (let i = 0; i < newDocs.length; i++) {
      setProgress(`Uploading file ${i + 1} of ${newDocs.length}...`);
      const doc = await compressImage(newDocs[i]); // shrinks image files; PDFs pass through
      const fd = new FormData();
      fd.append("file", doc);
      fd.append("listing_id", id!);
      fd.append("kind", "file");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setBusy(false); setProgress("");
        setErr(body.error ?? `File ${i + 1} failed to upload. The listing itself was saved.`);
        return;
      }
    }

    setProgress("");
    setBusy(false);
    router.push("/agent/listings");
    router.refresh();
  }

  function friendly(msg: string) {
    if (msg.toLowerCase().includes("street address")) {
      return "Blocked for safety: the marketing name or description appears to contain a street address. Addresses stay internal. Remove it from those fields and save again.";
    }
    if (msg.toLowerCase().includes("row-level security")) {
      return "You can only edit listings you added. Ask an admin to make this change.";
    }
    return msg;
  }

  const label = (t: string) => <label className="label">{t}</label>;

  return (
    <div className="pb-12">
      {/* PROPERTY BASICS */}
      <section className="mt-5 card p-5">
        <p className="text-xs font-bold text-teal">PROPERTY</p>
        <div className="mt-4 space-y-4">
          <div>{label("Address")}
            <input ref={addressInput} className="input" value={f.exact_address}
                   onChange={e => set("exact_address", e.target.value)}
                   onBlur={suggestPublicName} placeholder="45 Summit Avenue, Monticello, NY" /></div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>{label("Town")}
              <select className="input" value={f.town} onChange={e => set("town", e.target.value)}>
                {TOWNS.map(t => <option key={t}>{t}</option>)}
              </select></div>
            <div>{label("Type")}
              <select className="input" value={f.property_type} onChange={e => set("property_type", e.target.value)}>
                <option value="new_construction">New Construction</option>
                <option value="off_market_resale">Off-Market Resale</option>
                <option value="multi_family">Multi-Family</option>
                <option value="land">Land</option>
              </select></div>
            <div>{label("Status")}
              <select className="input" value={f.status} onChange={e => set("status", e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select></div>
            <div>{label("Delivery date")}
              <input className="input" type="date" value={f.delivery_date} onChange={e => set("delivery_date", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>{label("Beds")}<input className="input" type="number" value={f.beds} onChange={e => set("beds", e.target.value)} /></div>
            <div>{label("Baths")}<input className="input" type="number" step="0.5" value={f.baths} onChange={e => set("baths", e.target.value)} /></div>
            <div>{label("Sqft")}<input className="input" type="number" value={f.sqft} onChange={e => set("sqft", e.target.value)} /></div>
            <div>{label("Lot")}<input className="input" value={f.lot_desc} onChange={e => set("lot_desc", e.target.value)} placeholder="0.25 acre" /></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>{label("Price display")}
              <select className="input" value={f.price_display} onChange={e => set("price_display", e.target.value)}>
                <option value="exact">Exact price</option>
                <option value="range">Range</option>
                <option value="call">Price on request</option>
              </select></div>
            <div>{label("Price")}<input className="input" type="number" value={f.price} onChange={e => set("price", e.target.value)} /></div>
            <div>{label("Price max")}<input className="input" type="number" value={f.price_max} onChange={e => set("price_max", e.target.value)} /></div>
          </div>
        </div>
      </section>

      {/* REPRESENTATION */}
      <section className="mt-4 card p-5">
        <p className="text-xs font-bold text-teal flex items-center gap-1.5"><UserCheck size={14} /> LISTING AGENT</p>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>{label("Who represents this listing?")}
            <select className="input" value={f.listing_rep} onChange={e => set("listing_rep", e.target.value)}>
              {repChoices.map(m => <option key={m.id} value={m.id}>{m.full_name || "Unnamed"}{m.id === currentUserId ? " (me)" : ""}</option>)}
              <option value="open">Open listing: no listing agent</option>
            </select></div>
          {f.listing_rep === "open" ? (
            <div>{label("Seller contact phone (optional)")}
              <input className="input" type="tel" value={f.seller_phone} onChange={e => set("seller_phone", e.target.value)}
                     placeholder="845-555-1234" /></div>
          ) : (
            <div>{label("Commission offered")}
              <input className="input" value={f.commission} onChange={e => set("commission", e.target.value)}
                     placeholder="2% or $5,000 flat" /></div>
          )}
        </div>
        {f.listing_rep === "open" && (
          <p className="mt-3 text-sm text-slate-500">No listing agent. Agents contact the seller directly and negotiate their own commission.</p>
        )}
      </section>

      {/* PHOTOS */}
      <section className="mt-4 card p-5">
        <p className="text-xs font-bold text-teal">PHOTOS</p>
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); pickFiles(e.dataTransfer.files); }}
          className={"mt-4 rounded-btn transition-colors " + (dragOver ? "bg-teal-light outline-dashed outline-2 outline-teal p-2" : "")}
        >
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {photos.map(p => (
              <div key={p.id} className="relative aspect-square rounded-btn overflow-hidden border border-slate-200 group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="Listing photo" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeExistingPhoto(p.id)}
                        className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-1.5 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove photo">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {previews.map((src, i) => (
              <div key={src} className="relative aspect-square rounded-btn overflow-hidden border-2 border-teal group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="New photo" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeNewFile(i)}
                        className="absolute top-1.5 right-1.5 bg-white/90 rounded-full p-1.5 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove photo">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileInput.current?.click()}
                    className="aspect-square rounded-btn border-2 border-dashed border-slate-300 hover:border-teal hover:text-teal text-slate-400 flex flex-col items-center justify-center gap-1.5 text-xs font-semibold transition-colors">
              <ImagePlus size={22} /> Add photos
            </button>
          </div>
        </div>
        <input ref={fileInput} type="file" accept="image/*" multiple className="hidden"
               onChange={e => { pickFiles(e.target.files); e.target.value = ""; }} />
        <p className="mt-3 text-xs text-slate-500">Drag photos from a folder and drop them here, or click Add photos. They upload when you save.</p>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <div>{label("Old MLS number (optional)")}
            <input className="input" value={f.mls_number} onChange={e => set("mls_number", e.target.value)}
                   placeholder="H6123456" /></div>
          <div>{label("Link to more photos (optional)")}
            <input className="input" type="url" value={f.photos_url} onChange={e => set("photos_url", e.target.value)}
                   placeholder="https://drive.google.com/..." /></div>
        </div>
      </section>

      {/* FILES: floor plans, surveys, docs. Internal bucket, agents only. */}
      <section className="mt-4 card p-5 border-navy">
        <p className="flex items-center gap-1.5 text-xs font-bold text-white bg-navy-dark w-fit px-2.5 py-1 rounded-full">
          <Lock size={12} /> FILES (AGENTS ONLY)
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Floor plans, surveys, contracts. These never appear on client pages or flyers.
        </p>
        <div className="mt-3 space-y-2">
          {docs.map(d => (
            <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                 className="flex items-center gap-1.5 font-semibold text-teal hover:text-navy truncate">
                <FileText size={15} className="shrink-0" /> {d.name}
              </a>
              <button type="button" onClick={() => removeExistingDoc(d.id)} title="Remove file"
                      className="p-1.5 text-slate-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
          {newDocs.map((d, i) => (
            <div key={d.name + i} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-1.5 font-semibold text-navy truncate">
                <FileText size={15} className="shrink-0 text-teal" /> {d.name}
                <span className="text-xs font-normal text-slate-400">(uploads when you save)</span>
              </span>
              <button type="button" onClick={() => setNewDocs(prev => prev.filter((_, idx) => idx !== i))}
                      title="Remove" className="p-1.5 text-slate-400 hover:text-red-600 shrink-0"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => docInput.current?.click()}
                className="btn-secondary !py-2 !px-4 text-sm mt-3">
          <Paperclip size={14} /> Attach files
        </button>
        <input ref={docInput} type="file" multiple className="hidden"
               accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,image/*"
               onChange={e => {
                 const picked = Array.from(e.target.files ?? []);
                 setNewDocs(prev => [...prev, ...picked]);
                 e.target.value = "";
               }} />
        <p className="mt-2 text-xs text-slate-400">PDF, Word, Excel, or images. Up to 8 MB each.</p>
      </section>

      {/* MARKETING COPY (future public site) */}
      <section className="mt-4 card p-5">
        <p className="text-xs font-bold text-teal">MARKETING COPY</p>
        <p className="text-xs text-slate-500 mt-1">Used if the site opens to outside buyers later. Keep street addresses out of these fields.</p>
        <div className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>{label("Display name (no house numbers)")}
              <input className="input" value={f.public_name} onChange={e => set("public_name", e.target.value)} /></div>
            <div>{label("Area label")}
              <input className="input" value={f.neighborhood_label} onChange={e => set("neighborhood_label", e.target.value)} placeholder="Summit Ave corridor" /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label !mb-0">Description</label>
              {aiEnabled && (
                <button type="button" onClick={generateDescription} disabled={aiBusy}
                        className="text-xs font-semibold text-teal hover:text-navy inline-flex items-center gap-1 disabled:opacity-50">
                  <Sparkles size={13} /> {aiBusy ? "Writing..." : "Write it with AI"}
                </button>
              )}
            </div>
            <textarea className="input" rows={4} value={f.description_public} onChange={e => set("description_public", e.target.value)} />
            {aiErr && <p className="text-xs text-red-600 font-semibold mt-1">{aiErr}</p>}
            {aiEnabled && (
              <p className="text-xs text-slate-400 mt-1">AI uses the property details above. It is never given the address. Always read it over before saving.</p>
            )}
          </div>
        </div>
      </section>

      {/* INTERNAL */}
      <section className="mt-4 card p-5 border-navy">
        <p className="flex items-center gap-1.5 text-xs font-bold text-white bg-navy-dark w-fit px-2.5 py-1 rounded-full">
          <Lock size={12} /> INTERNAL ONLY
        </p>
        <div className="mt-4 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>{label("Co-broke / commission terms")}
              <input className="input" value={f.cobroke_terms} onChange={e => set("cobroke_terms", e.target.value)} /></div>
            <div>{label("Source")}
              <input className="input" value={f.source} onChange={e => set("source", e.target.value)} placeholder="Builder direct, referral..." /></div>
          </div>
          <div>{label("Internal notes")}
            <textarea className="input" rows={2} value={f.notes_internal} onChange={e => set("notes_internal", e.target.value)} /></div>
        </div>
      </section>

      {err && <p className="mt-4 text-sm text-red-600 font-semibold">{err}</p>}
      {progress && <p className="mt-4 text-sm text-teal font-semibold">{progress}</p>}
      <div className="mt-5 flex gap-3">
        <button onClick={save} disabled={busy} className="btn-primary flex-1">
          <Upload size={16} /> {busy ? "Saving..." : listingId ? "Save Changes" : "Save Listing"}
        </button>
      </div>
    </div>
  );
}
