"use client";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-client";
import { CheckCircle2, Trash2, RotateCcw } from "lucide-react";

export default function NeedActions({ needId, status }: { needId: string; status: string }) {
  const router = useRouter();

  async function setStatus(next: string) {
    const supabase = supabaseBrowser();
    await supabase.from("buyer_needs").update({ status: next }).eq("id", needId);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Remove this buyer from the board?")) return;
    const supabase = supabaseBrowser();
    await supabase.from("buyer_needs").delete().eq("id", needId);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 shrink-0">
      {status === "active" ? (
        <button onClick={() => setStatus("fulfilled")} title="Mark found a home"
                className="p-2 text-slate-400 hover:text-teal"><CheckCircle2 size={16} /></button>
      ) : (
        <button onClick={() => setStatus("active")} title="Reactivate"
                className="p-2 text-slate-400 hover:text-teal"><RotateCcw size={16} /></button>
      )}
      <button onClick={remove} title="Remove"
              className="p-2 text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
    </div>
  );
}
