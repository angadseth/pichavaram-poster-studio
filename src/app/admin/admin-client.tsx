"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "rc" | "designer" | "admin";
type Person = { email: string; name: string; region: string; role: Role; active: boolean };
const ROLE_LABEL: Record<Role, string> = { rc: "RC", designer: "Designer", admin: "Admin" };
type House = { id: string; name: string; logo: string; custom: boolean };

async function call(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function PeopleAdmin({ initial, me }: { initial: Person[]; me: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", name: "", region: "", role: "rc" as Role });
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(p: Promise<{ ok: boolean; data: Record<string, unknown> }>, success: string) {
    setBusy(true);
    const r = await p;
    setBusy(false);
    const invalid = Array.isArray(r.data.invalid) && r.data.invalid.length ? ` Skipped invalid: ${r.data.invalid.join(", ")}` : "";
    setMsg(r.ok ? { ok: true, text: success + invalid } : { ok: false, text: String(r.data.error ?? "Something went wrong.") });
    if (r.ok) router.refresh();
    return r.ok;
  }

  return (
    <section className="panel mt-10 p-6">
      <h2 className="display text-3xl">People who can sign in</h2>
      <p className="muted mt-1 text-sm">RCs ask for posters. Designers make the ones assigned to them. Admins assign requests and manage this list.</p>

      <div className="mt-6 overflow-x-auto">
        <table className="table min-w-[640px]">
          <thead><tr><th>Email</th><th>Name</th><th>Region</th><th>Role</th><th /></tr></thead>
          <tbody>
            {initial.map((p) => (
              <tr key={p.email}>
                <td>{p.email}</td>
                <td>{p.name || <span className="muted">–</span>}</td>
                <td>{p.region || <span className="muted">–</span>}</td>
                <td>{ROLE_LABEL[p.role]}</td>
                <td className="text-right">
                  {p.email !== me ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={busy}
                      onClick={() => run(call(`/api/admin/users?email=${encodeURIComponent(p.email)}`, "DELETE"), `Removed ${p.email}.`)}
                    >
                      Remove
                    </button>
                  ) : <span className="muted text-xs">You</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(call("/api/admin/users", "POST", form), `Added ${form.email}.`)) setForm({ email: "", name: "", region: "", role: "rc" });
          }}
        >
          <h3 className="font-semibold">Add one person</h3>
          <input className="input" type="email" required placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Region" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
          </div>
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
            <option value="rc">RC (asks for posters)</option>
            <option value="designer">Designer (makes posters)</option>
            <option value="admin">Admin</option>
          </select>
          <button className="btn btn-brass" disabled={busy}>Add person</button>
        </form>
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(call("/api/admin/users", "POST", { bulk }), "Imported the list.")) setBulk("");
          }}
        >
          <h3 className="font-semibold">Import many at once</h3>
          <textarea
            className="input min-h-[150px]"
            placeholder={"One per line: email, name, region\n24f1000001@ds.study.iitm.ac.in, Asha, Chandigarh Region"}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          />
          <button className="btn btn-ghost" disabled={busy || !bulk.trim()}>Import list</button>
        </form>
      </div>
      {msg ? <p className={`mt-4 text-sm ${msg.ok ? "text-[var(--kingfisher)]" : "text-[var(--danger)]"}`} role="status">{msg.text}</p> : null}
    </section>
  );
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function HousesAdmin({ initial }: { initial: House[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [newName, setNewName] = useState("");

  async function upload(h: House, file: File | undefined) {
    if (!file) return;
    setBusy(h.id);
    const r = await call("/api/admin/houses", "POST", { id: h.id, logo: await readFile(file) });
    setBusy(null);
    setMsg(r.ok ? { ok: true, text: `Updated the ${h.name} logo.` } : { ok: false, text: String(r.data.error ?? "Upload failed.") });
    if (r.ok) router.refresh();
  }

  return (
    <section className="panel mt-10 p-6">
      <h2 className="display text-3xl">House logos</h2>
      <p className="muted mt-1 text-sm">Each house uses its crest. Upload a new logo to replace it (a square PNG with a transparent background works best).</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initial.map((h) => (
          <li key={h.id} className="tile flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={h.logo} alt="" width={56} height={56} className="crest" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{h.name}</div>
              <div className="muted text-xs">{h.custom ? "Custom logo" : "House crest"}</div>
              <div className="mt-2 flex gap-2">
                <label className="btn btn-ghost btn-sm cursor-pointer">
                  {busy === h.id ? "Uploading…" : "Upload"}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => upload(h, e.target.files?.[0])} />
                </label>
                {h.custom ? (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={async () => {
                      setBusy(h.id);
                      const r = await call("/api/admin/houses", "POST", { id: h.id, logo: null });
                      setBusy(null);
                      if (r.ok) router.refresh();
                    }}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-6 flex flex-wrap gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await call("/api/admin/houses", "POST", { create: { name: newName } });
          setMsg(r.ok ? { ok: true, text: `Added ${newName}.` } : { ok: false, text: String(r.data.error ?? "Couldn't add the house.") });
          if (r.ok) {
            setNewName("");
            router.refresh();
          }
        }}
      >
        <input className="input max-w-xs" placeholder="New house name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn btn-ghost" disabled={newName.trim().length < 2}>Add house</button>
      </form>
      {msg ? <p className={`mt-4 text-sm ${msg.ok ? "text-[var(--kingfisher)]" : "text-[var(--danger)]"}`} role="status">{msg.text}</p> : null}
    </section>
  );
}
