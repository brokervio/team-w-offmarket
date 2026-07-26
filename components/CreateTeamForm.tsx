"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Wand2 } from "lucide-react";

export default function CreateTeamForm() {
  const router = useRouter();
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "agent" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF(prev => ({ ...prev, [k]: v }));

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "";
    const rand = new Uint32Array(12);
    crypto.getRandomValues(rand);
    rand.forEach(n => { pw += chars[n % chars.length]; });
    set("password", "Tw!" + pw);
  }

  async function create() {
    setErr(""); setOk(""); setBusy(true);
    const r = await fetch("/api/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f)
    });
    setBusy(false);
    if (!r.ok) {
      const body = await r.json().catch(() => ({}));
      setErr(body.error ?? "Could not create the account.");
      return;
    }
    setOk(`Account created. Give ${f.full_name} this login: ${f.email} / ${f.password}`);
    setF({ full_name: "", email: "", password: "", role: "agent" });
    router.refresh();
  }

  return (
    <div className="mt-4 grid sm:grid-cols-2 gap-3">
      <div><label className="label">Full name</label>
        <input className="input" value={f.full_name} onChange={e => set("full_name", e.target.value)} /></div>
      <div><label className="label">Email</label>
        <input className="input" type="email" value={f.email} onChange={e => set("email", e.target.value)} /></div>
      <div><label className="label">Temporary password</label>
        <div className="flex gap-2">
          <input className="input" value={f.password} onChange={e => set("password", e.target.value)} placeholder="8+ characters" />
          <button type="button" onClick={generatePassword} title="Generate a password"
                  className="btn-secondary !px-3 shrink-0"><Wand2 size={16} /></button>
        </div></div>
      <div><label className="label">Role</label>
        <select className="input" value={f.role} onChange={e => set("role", e.target.value)}>
          <option value="agent">Agent</option>
          <option value="admin">Admin</option>
        </select></div>
      {err && <p className="sm:col-span-2 text-sm text-red-600 font-semibold">{err}</p>}
      {ok && <p className="sm:col-span-2 text-sm text-teal font-semibold">{ok} <span className="text-slate-500 font-normal">(copy it now, it is not shown again)</span></p>}
      <div className="sm:col-span-2">
        <button onClick={create} disabled={busy} className="btn-primary">
          <UserPlus size={16} /> {busy ? "Creating..." : "Create Account"}
        </button>
      </div>
    </div>
  );
}
