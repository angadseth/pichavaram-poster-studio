import Link from "next/link";
import { Status } from "@/components/status";
import { db, ensureSchema } from "@/lib/db";
import { EVENT_LABELS, fmtDate, fmtStamp } from "@/lib/events";
import { listDesigners, listHouses, listRequests, type RequestRow } from "@/lib/requests";
import { requireAdmin } from "@/lib/session";
import { HousesAdmin, PeopleAdmin } from "./admin-client";

export const metadata = { title: "Admin · Pichavaram Poster Studio" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  await ensureSchema();
  const [requests, houses, people, designers] = await Promise.all([
    listRequests({}, 500),
    listHouses(),
    db().execute("SELECT email, name, region, role, active FROM people ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'designer' THEN 1 ELSE 2 END, region, email"),
    listDesigners(),
  ]);
  const nameOf = new Map(designers.map((d) => [d.email, d.name || d.email]));
  const waiting = requests.filter((r) => r.status === "new");
  const inDesign = requests.filter((r) => r.status === "assigned");
  const delivered = requests.filter((r) => r.status === "delivered");
  const stats = [
    { label: "Waiting for a designer", value: waiting.length },
    { label: "In design", value: inDesign.length },
    { label: "Delivered", value: delivered.length },
    { label: "Designers", value: designers.filter((d) => d.role === "designer").length },
  ];
  // open work first (soonest event on top), then delivered (newest first)
  const ordered: RequestRow[] = [
    ...[...waiting, ...inDesign].sort((a, b) => a.input.date.localeCompare(b.input.date)),
    ...delivered,
  ];

  return (
    <div className="shell pt-12">
      <h1 className="display text-[clamp(44px,7vw,88px)]">Admin</h1>
      <p className="muted mt-2">Signed in as {admin.email}</p>
      <div className="rule mt-6" />

      <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="panel p-6">
            <div className="muted text-sm">{s.label}</div>
            <div className="display gold-text mt-2 text-6xl">{s.value}</div>
          </div>
        ))}
      </section>

      <section className="panel mt-10 overflow-x-auto p-6">
        <h2 className="display text-3xl">Requests</h2>
        <p className="muted mt-1 text-sm">Open one to assign a designer. New requests also arrive in your email.</p>
        <table className="table mt-5 min-w-[820px]">
          <thead>
            <tr><th>Poster</th><th>Event date</th><th>Requested by</th><th>Designer</th><th>Requested</th><th>Status</th></tr>
          </thead>
          <tbody>
            {ordered.length === 0 ? (
              <tr><td colSpan={6} className="muted">Requests will show up here.</td></tr>
            ) : null}
            {ordered.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link className="underline decoration-[var(--gold)] underline-offset-4" href={`/requests/${r.id}`}>{r.title}</Link>
                  <div className="muted text-xs">{EVENT_LABELS[r.eventType]}</div>
                </td>
                <td>{fmtDate(r.input.date)}</td>
                <td>{r.email}</td>
                <td>
                  {r.assignee ? nameOf.get(r.assignee) ?? r.assignee : (
                    <Link className="btn btn-brass btn-sm" href={`/requests/${r.id}`}>Assign</Link>
                  )}
                </td>
                <td className="muted">{fmtStamp(r.createdAt)}</td>
                <td><Status status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <PeopleAdmin
        me={admin.email}
        initial={people.rows.map((u) => ({
          email: String(u.email),
          name: String(u.name),
          region: String(u.region),
          role: u.role as "rc" | "designer" | "admin",
          active: Boolean(u.active),
        }))}
      />
      <HousesAdmin initial={houses.map(({ id, name, logo, custom }) => ({ id, name, logo, custom }))} />
    </div>
  );
}
