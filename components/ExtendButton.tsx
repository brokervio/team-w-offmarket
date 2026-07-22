"use client";
import { useState } from "react";

export default function ExtendButton({ userId }: { userId: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  async function extend() {
    setState("busy");
    const r = await fetch("/api/extend", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId })
    });
    setState(r.ok ? "done" : "idle");
  }
  if (state === "done") return <span className="badge-teal">+4 weeks sent</span>;
  return (
    <button onClick={extend} disabled={state === "busy"} className="btn-primary !py-2 !px-3 text-sm shrink-0">
      {state === "busy" ? "..." : "Extend 4 Weeks"}
    </button>
  );
}
