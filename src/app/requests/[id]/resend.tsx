"use client";

import { useState } from "react";

export function Resend({ id, label }: { id: string; label: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "failed">("idle");
  return (
    <button
      className="btn btn-ghost"
      disabled={state === "busy" || state === "sent"}
      onClick={async () => {
        setState("busy");
        const res = await fetch(`/api/requests/${id}/resend`, { method: "POST" });
        setState(res.ok ? "sent" : "failed");
        if (res.ok) setTimeout(() => window.location.reload(), 800);
      }}
    >
      {state === "busy" ? "Sending…" : state === "sent" ? "Emailed" : state === "failed" ? "Failed, try again" : label}
    </button>
  );
}
