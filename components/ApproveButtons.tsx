"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";

export default function ApproveButtons({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function setStatus(status: string) {
    setBusy(true); setErr("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("listings")
      .update({ status, published_at: status === "coming_soon" ? new Date().toISOString() : null })
      .eq("id", listingId);
    setBusy(false);
    if (error) { setErr(error.message.includes("street address") ? "Blocked: address in public copy" : error.message); return; }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div className="flex gap-2">
        <button onClick={() => setStatus("coming_soon")} disabled={busy} className="btn-primary !py-1.5 !px-3 text-xs">Publish</button>
        <button onClick={() => setStatus("draft")} disabled={busy} className="btn-secondary !py-1.5 !px-3 text-xs">Reject</button>
      </div>
      {err && <p className="text-xs text-red-600 font-semibold max-w-[180px] text-right">{err}</p>}
    </div>
  );
}
