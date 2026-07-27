"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import { Send, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";

export function ReplyBox({ postId, currentUserId }: { postId: string; currentUserId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!body.trim()) return;
    setBusy(true);
    const supabase = supabaseBrowser();
    await supabase.from("intel_replies").insert({ post_id: postId, author_id: currentUserId, body: body.trim() });
    setBusy(false);
    setBody("");
    router.refresh();
  }

  return (
    <div className="mt-3 flex gap-2">
      <input className="input !py-2 text-sm flex-1" value={body} onChange={e => setBody(e.target.value)}
             placeholder="Share what you know..."
             onKeyDown={e => e.key === "Enter" && send()} />
      <button onClick={send} disabled={busy || !body.trim()} className="btn-primary !py-2 !px-3 text-sm shrink-0">
        <Send size={14} />
      </button>
    </div>
  );
}

export function PostActions({ postId, status, canManage }: { postId: string; status: string; canManage: boolean }) {
  const router = useRouter();
  if (!canManage) return null;

  async function setStatus(next: string) {
    const supabase = supabaseBrowser();
    await supabase.from("intel_posts").update({ status: next }).eq("id", postId);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove this question and its answers?")) return;
    const supabase = supabaseBrowser();
    await supabase.from("intel_posts").delete().eq("id", postId);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {status === "open" ? (
        <button onClick={() => setStatus("answered")} title="Mark answered"
                className="p-2 text-slate-400 hover:text-teal"><CheckCircle2 size={16} /></button>
      ) : (
        <button onClick={() => setStatus("open")} title="Reopen"
                className="p-2 text-slate-400 hover:text-teal"><RotateCcw size={16} /></button>
      )}
      <button onClick={remove} title="Remove"
              className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
    </div>
  );
}
