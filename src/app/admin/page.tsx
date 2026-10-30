import Link from "next/link";
import { fmtStamp, Status } from "@/components/status";
import { db, ensureSchema } from "@/lib/db";
import { listHouses, listRequests } from "@/lib/pipeline";
import { requireAdmin } from "@/lib/session";
import { TEMPLATES } from "@/poster/registry";
import { EVENT_LABELS, type EventType } from "@/poster/types";
import { HousesAdmin, PeopleAdmin } from "./admin-client";

export const metadata = { title: "Admin · Pichavaram Poster Studio" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  await ensureSchema();
  const [requests, houses, users] = await Promise.all([
    listRequests(undefined, 300),
    listHouses(),
    db().execute("SELECT email, name, region, role, active FROM users ORDER BY role DESC, region, email"),
  ]);
  const sent = requests.filter((r) => r.status === "sent").length;
  const failed = requests.filter((r) => r.status === "failed").length;
  const timed = requests.filter((r) => r.renderMs);
  const avgMs = timed.length ? timed.reduce((a, r) => a + (r.renderMs ?? 0), 0) / timed.length : 0;
  const byType = Object.entries(
    requests.reduce<Record<string, number>>((acc, r) => ((acc[r.eventType] = (acc[r.eventType] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  const byTemplate = TEMPLATES.map((t) => ({ name: t.name, n: requests.filter((r) => r.templateId === t.id).length }));

  const stats = [
    { label: "Posters made", value: String(requests.length) },
    { label: "Emailed", value: String(sent) },
    { label: "Email failures", value: String(failed) },
    { label: "Average render", value: avgMs ? `${(avgMs / 1000).toFixed(1)}s` : "–" },
  ];

  return (
    <div className="shell pt-6">
      <h1 className="display text-4xl sm:text-5xl">Admin</h1>
      <p className="muted mt-2">Signed in as {admin.email}</p>

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-6">
            <div className="muted text-sm">{s.label}</div>
            <div className="display mt-2 text-4xl">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="panel p-6">
          <h2 className="font-semibold">Requests by event type</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {byType.length === 0 ? <li className="muted text-sm">No requests yet.</li> : null}
            {byType.map(([t, n]) => (
              <li key={t} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0">{EVENT_LABELS[t as EventType] ?? t}</span>
                <span className="h-2 rounded-full bg-[var(--brass)]" style={{ width: `${(n / requests.length) * 100}%`, minWidth: 6 }} />
                <span className="muted">{n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel p-6">
          <h2 className="font-semibold">Design usage</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
            {byTemplate.map((t) => (
              <li key={t.name} className="flex justify-between"><span>{t.name}</span><span className="muted">{t.n}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="panel mt-10 overflow-x-auto p-6">
        <h2 className="display text-2xl">All requests</h2>
        <table className="table mt-4 min-w-[760px]">
          <thead>
            <tr><th>Poster</th><th>Requested by</th><th>Hosted by</th><th>Event</th><th>When requested</th><th>Status</th></tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr><td colSpan={6} className="muted">Requests will show up here.</td></tr>
            ) : null}
            {requests.map((r) => (
              <tr key={r.id}>
                <td><Link className="underline decoration-[var(--brass)] underline-offset-4" href={`/requests/${r.id}`}>{r.title}</Link></td>
                <td>{r.email}</td>
                <td>{r.hostName}</td>
                <td>{EVENT_LABELS[r.eventType as EventType] ?? r.eventType}</td>
                <td className="muted">{fmtStamp(r.createdAt)}</td>
                <td><Status status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <PeopleAdmin
        me={admin.email}
        initial={users.rows.map((u) => ({
          email: String(u.email),
          name: String(u.name),
          region: String(u.region),
          role: u.role as "rc" | "admin",
          active: Boolean(u.active),
        }))}
      />
      <HousesAdmin initial={houses.map(({ id, name, logo, custom }) => ({ id, name, logo, custom }))} />
    </div>
  );
}
