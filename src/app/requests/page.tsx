import Link from "next/link";
import { fmtDate, Status } from "@/components/status";
import { listRequests } from "@/lib/pipeline";
import { requireUser } from "@/lib/session";
import { EVENT_LABELS, type EventType } from "@/poster/types";

export const metadata = { title: "My posters · Pichavaram Poster Studio" };

export default async function RequestsPage() {
  const user = await requireUser();
  const rows = await listRequests(user.email);
  return (
    <div className="shell pt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-4xl sm:text-5xl">My posters</h1>
        <Link href="/studio" className="btn btn-brass">Request a poster</Link>
      </div>
      {rows.length === 0 ? (
        <div className="panel mt-10 p-10 text-center">
          <p className="display text-2xl">No posters yet</p>
          <p className="muted mt-2">Your first one takes about a minute.</p>
          <Link href="/studio" className="btn btn-brass mt-6">Request a poster</Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/requests/${r.id}`} className="group block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/posters/${r.id}?thumb=1`}
                  alt={`${r.title} poster`}
                  loading="lazy"
                  className="aspect-[4/5] w-full rounded-xl border border-[var(--line)] bg-[var(--lagoon)] object-cover transition group-hover:border-[var(--brass)]"
                />
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{r.title}</div>
                    <div className="muted text-sm">{EVENT_LABELS[r.eventType as EventType]} · {fmtDate(r.input.date)}</div>
                  </div>
                  <Status status={r.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
