"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Pencil, KeyRound, Trash2, X, Check } from "lucide-react";

export type TeamRow = {
  id: string; full_name: string; email: string; phone: string;
  contact_email: string; role: string; isMe: boolean;
};

export default function TeamManager({ team }: { team: TeamRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [f, setF] = useState({ full_name: "", phone: "", contact_email: "", role: "agent" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(m: TeamRow) {
    setErr(""); setMsg("");
    setEditing(m.id);
    setF({ full_name: m.full_name, phone: m.phone, contact_email: m.contact_email, role: m.role });
  }

  async function call(method: "PATCH" | "DELETE", body: Record<string, any>) {
    setErr(""); setMsg(""); setBusy(true);
    const r = await fetch("/api/team", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    setBusy(false);
    if (!r.ok) {
      const data = await r.json().catch(() => ({}));
      setErr(data.error ?? "Something went wrong.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function saveEdit(id: string) {
    if (await call("PATCH", { user_id: id, ...f })) {
      setEditing(null);
      setMsg("Saved.");
    }
  }

  async function resetPassword(m: TeamRow) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pw = "Tw!";
    const rand = new Uint32Array(12);
    crypto.getRandomValues(rand);
    rand.forEach(n => { pw += chars[n % chars.length]; });
    if (!confirm(`Reset the password for ${m.full_name || m.email}? They will need the new one to sign in.`)) return;
    if (await call("PATCH", { user_id: m.id, password: pw })) {
      setMsg(`New password for ${m.full_name || m.email}: ${pw} (copy it now, it is not shown again)`);
    }
  }

  async function remove(m: TeamRow) {
    if (!confirm(`Remove ${m.full_name || m.email} from the team? Their listings transfer to you. This cannot be undone.`)) return;
    if (await call("DELETE", { user_id: m.id })) {
      setMsg(`${m.full_name || m.email} was removed. Their listings now belong to you.`);
    }
  }

  return (
    <div className="mt-3">
      <div className="divide-y divide-slate-100">
        {team.map(m => (
          <div key={m.id} className="py-3">
            {editing === m.id ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <div><label className="label !text-xs">Name</label>
                  <input className="input !py-2 text-sm" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></div>
                <div><label className="label !text-xs">Role</label>
                  <select className="input !py-2 text-sm" value={f.role} disabled={m.isMe}
                          onChange={e => setF({ ...f, role: e.target.value })}>
                    <option value="agent">Agent</option>
                    <option value="admin">Admin</option>
                  </select></div>
                <div><label className="label !text-xs">Phone (shown to clients)</label>
                  <input className="input !py-2 text-sm" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
                <div><label className="label !text-xs">Contact email (shown to clients)</label>
                  <input className="input !py-2 text-sm" value={f.contact_email} onChange={e => setF({ ...f, contact_email: e.target.value })} /></div>
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(m.id)} disabled={busy} className="btn-primary !py-1.5 !px-4 text-sm">
                    <Check size={14} /> Save
                  </button>
                  <button onClick={() => setEditing(null)} className="btn-secondary !py-1.5 !px-4 text-sm">
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy truncate flex items-center gap-1.5">
                    {m.full_name || "Unnamed"}
                    {m.role === "admin" && <ShieldCheck size={15} className="text-teal" />}
                    {m.isMe && <span className="text-xs font-normal text-slate-400">(you)</span>}
                  </p>
                  <p className="text-sm text-slate-500 truncate">
                    {m.email}{m.phone ? " | " + m.phone : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={m.role === "admin" ? "badge-teal" : "badge-navy"}>{m.role}</span>
                  <button onClick={() => startEdit(m)} title="Edit"
                          className="p-2 text-slate-400 hover:text-navy"><Pencil size={15} /></button>
                  <button onClick={() => resetPassword(m)} title="Reset password"
                          className="p-2 text-slate-400 hover:text-navy"><KeyRound size={15} /></button>
                  {!m.isMe && (
                    <button onClick={() => remove(m)} title="Remove from team"
                            className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={15} /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {err && <p className="mt-2 text-sm text-red-600 font-semibold">{err}</p>}
      {msg && <p className="mt-2 text-sm text-teal font-semibold">{msg}</p>}
    </div>
  );
}
