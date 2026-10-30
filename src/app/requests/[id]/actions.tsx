"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Designer = { email: string; name: string; role: string };

/** Admin: pick who designs this poster. */
export function AssignForm({ id, designers, current }: { id: string; designers: Designer[]; current: string | null }) {
  const router = useRouter();
  const [who, setWho] = useState(current ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!designers.length) {
    return <p className="muted text-sm">Add a designer under Admin → People first (role: Designer).</p>;
  }
  return (
    <form
      className="flex flex-wrap gap-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMsg(null);
        const res = await fetch(`/api/requests/${id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assignee: who }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setMsg({ ok: false, text: data.error ?? "Couldn't assign it." });
        const name = designers.find((d) => d.email === who)?.name || who;
        setMsg({ ok: true, text: data.mailed ? `Assigned. ${name} has the brief in their inbox.` : `Assigned to ${name}, but the email failed; tell them directly.` });
        router.refresh();
      }}
    >
      <select className="input max-w-sm flex-1" required value={who} onChange={(e) => setWho(e.target.value)} aria-label="Designer">
        <option value="" disabled>Choose a designer</option>
        {designers.map((d) => (
          <option key={d.email} value={d.email}>
            {d.name ? `${d.name} (${d.email})` : d.email}{d.role === "admin" ? " · admin" : ""}
          </option>
        ))}
      </select>
      <button className="btn btn-brass" disabled={busy || !who || who === current}>{busy ? "Assigning…" : current ? "Reassign" : "Assign"}</button>
      {msg ? <p className={`w-full text-sm ${msg.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"}`} role="status">{msg.text}</p> : null}
    </form>
  );
}

const LIMIT = 4 * 1024 * 1024;

/** Shrinks a too-big image in the browser (Vercel takes at most ~4.5 MB per upload). */
async function fit(file: File): Promise<Blob> {
  if (file.size <= LIMIT) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  for (const q of [0.92, 0.85, 0.75]) {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", q));
    if (blob && blob.size <= LIMIT) return blob;
  }
  throw new Error("too big");
}

/** Designer/admin: upload the finished poster; it is emailed to the RC. */
export function UploadPoster({ id, replacing, rcEmail }: { id: string; replacing: boolean; rcEmail: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file) return;
        setBusy(true);
        setMsg(null);
        let blob: Blob;
        try {
          blob = await fit(file);
        } catch {
          setBusy(false);
          return setMsg({ ok: false, text: "That image is too large. Export it under 4 MB and try again." });
        }
        const body = new FormData();
        body.append("poster", blob, file.name);
        const res = await fetch(`/api/requests/${id}/poster`, { method: "POST", body });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) return setMsg({ ok: false, text: data.error ?? "Upload failed. Try again." });
        setMsg({ ok: true, text: data.mailed ? `Sent. The poster is on its way to ${rcEmail}.` : "Saved, but the email failed. Use “Email it again”." });
        setFile(null);
        setPreview("");
        router.refresh();
      }}
    >
      <label className="drop">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Selected poster" className="max-h-72 rounded-md" />
        ) : (
          <>
            <span className="display text-2xl">Drop the poster here</span>
            <span className="muted text-sm">or click to choose. PNG or JPG.</span>
          </>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            setMsg(null);
            setPreview(f ? URL.createObjectURL(f) : "");
          }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <button className="btn btn-brass" disabled={busy || !file}>
          {busy ? "Sending…" : replacing ? "Replace and email the RC" : "Send poster to the RC"}
        </button>
        {file ? <span className="muted text-sm">{file.name}</span> : null}
      </div>
      {msg ? <p className={`text-sm ${msg.ok ? "text-[var(--ok)]" : "text-[var(--danger)]"}`} role="status">{msg.text}</p> : null}
    </form>
  );
}

export function Resend({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "failed">("idle");
  return (
    <button
      className="btn btn-ghost"
      disabled={state === "busy" || state === "sent"}
      onClick={async () => {
        setState("busy");
        const res = await fetch(`/api/requests/${id}/resend`, { method: "POST" });
        setState(res.ok ? "sent" : "failed");
      }}
    >
      {state === "busy" ? "Sending…" : state === "sent" ? "Emailed" : state === "failed" ? "Failed, try again" : "Email it again"}
    </button>
  );
}
