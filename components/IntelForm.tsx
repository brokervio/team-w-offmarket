"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import { MessageCirclePlus } from "lucide-react";

export default function IntelForm({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const [location, setLocation] = useState("");
  const [question, setQuestion] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function post() {
    setErr("");
    if (!location.trim()) { setErr("Where is it? Give an address or a description of the spot."); return; }
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("intel_posts").insert({
      author_id: currentUserId,
      location: location.trim(),
      question: question.trim() || null
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setLocation(""); setQuestion("");
    router.refresh();
  }

  return (
    <div className="card p-5 mt-5">
      <p className="text-xs font-bold text-teal">ASK THE TEAM</p>
      <div className="mt-3 space-y-3">
        <div><label className="label !text-xs">Where</label>
          <input className="input !py-2 text-sm" value={location} onChange={e => setLocation(e.target.value)}
                 placeholder="12 Elm St, Monsey (or: corner of Maple and Route 306)" /></div>
        <div><label className="label !text-xs">What do you want to know?</label>
          <textarea className="input !py-2 text-sm" rows={2} value={question} onChange={e => setQuestion(e.target.value)}
                    placeholder="Anyone know who is building here? Is it for sale?" /></div>
      </div>
      {err && <p className="mt-2 text-sm text-red-600 font-semibold">{err}</p>}
      <button onClick={post} disabled={busy} className="btn-primary mt-3 !py-2 text-sm">
        <MessageCirclePlus size={15} /> {busy ? "Posting..." : "Post to the Team"}
      </button>
    </div>
  );
}
