"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Save } from "lucide-react";
import { compressImage } from "@/lib/compress";

export default function ProfileForm({ initial }: {
  initial: { full_name: string; phone: string; contact_email: string; avatar_url: string | null };
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ full_name: initial.full_name, phone: initial.phone, contact_email: initial.contact_email });
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial.avatar_url);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));

  async function save() {
    setErr(""); setMsg(""); setBusy(true);
    const fd = new FormData();
    fd.append("full_name", f.full_name);
    fd.append("phone", f.phone);
    fd.append("contact_email", f.contact_email);
    if (photo) fd.append("photo", await compressImage(photo, 1200));
    const r = await fetch("/api/profile", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setErr(body.error ?? "Could not save.");
      return;
    }
    setMsg("Saved. Your info now appears on flyers and client pages.");
    router.refresh();
  }

  return (
    <div className="card p-6 mt-5">
      <div className="flex items-center gap-5">
        <button type="button" onClick={() => fileInput.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-slate-200 hover:border-teal transition-colors shrink-0 bg-slate-100 flex items-center justify-center text-slate-400 group">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Profile photo" className="w-full h-full object-cover" />
          ) : (
            <Camera size={26} />
          )}
          <span className="absolute inset-0 bg-navy/60 text-white text-xs font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            Change
          </span>
        </button>
        <div className="text-sm text-slate-500">
          <p className="font-semibold text-navy">Profile photo</p>
          <p className="mt-0.5">Shown on flyers and on pages you share with clients. A clear headshot works best.</p>
        </div>
      </div>
      <input ref={fileInput} type="file" accept="image/*" className="hidden"
             onChange={e => {
               const file = e.target.files?.[0] ?? null;
               setPhoto(file);
               if (file) setPreview(URL.createObjectURL(file));
               e.target.value = "";
             }} />

      <div className="mt-6 space-y-4">
        <div><label className="label">Full name</label>
          <input className="input" value={f.full_name} onChange={e => set("full_name", e.target.value)} /></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="label">Phone (shown to clients)</label>
            <input className="input" type="tel" value={f.phone} onChange={e => set("phone", e.target.value)}
                   placeholder="845-555-1234" /></div>
          <div><label className="label">Email (shown to clients)</label>
            <input className="input" type="email" value={f.contact_email} onChange={e => set("contact_email", e.target.value)}
                   placeholder="you@teamwny.com" /></div>
        </div>
      </div>

      {err && <p className="mt-4 text-sm text-red-600 font-semibold">{err}</p>}
      {msg && <p className="mt-4 text-sm text-teal font-semibold">{msg}</p>}
      <button onClick={save} disabled={busy} className="btn-primary mt-5">
        <Save size={16} /> {busy ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
