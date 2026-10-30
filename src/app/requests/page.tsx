import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { fmtDate, Status } from "@/components/status";
import { listRequests } from "@/lib/pipeline";
import { requireUser } from "@/lib/session";
import { EVENT_LABELS, type EventType } from "@/poster/types";

export const metadata = { title: "My posters · Pichavaram Poster Studio" };

export default async function RequestsPage() {
  const user = await requireUser();
  const rows = await listRequests(user.email);
  return (
    <div className="shell pt-12">
      <AutoRefresh active={rows.some((r) => r.status === "pending")} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[clamp(44px,7vw,88px)]">My <em>posters</em></h1>
        <Link href="/studio" className="btn btn-brass">Make a poster</Link>
      </div>
      <div className="rule mt-6" />
      {rows.length === 0 ? (
        <div className="py-24 text-center">
          <p className="display text-4xl">Nothing here yet</p>
          <p className="muted mt-3">Your first poster reaches your inbox within a minute of asking.</p>
          <Link href="/studio" className="btn btn-brass mt-8">Make a poster</Link>
        </div>
      ) : (
        <ul className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/requests/${r.id}`} className="group block">
                {r.status === "pending" ? (
                  <div className="shimmer grid aspect-[4/5] w-full place-items-center rounded-md border border-[var(--line)]">
                    <span className="display text-2xl text-[var(--gold-hi)]">Designing…</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/posters/${r.id}?thumb=1`}
                    alt={`${r.title} poster`}
                    loading="lazy"
                    className="aspect-[4/5] w-full rounded-md bg-[var(--ink-3)] object-cover shadow-[0_0_0_1px_var(--line)] transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_0_0_1px_var(--gold),0_30px_60px_-30px_#000]"
                  />
                )}
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="display truncate text-2xl">{r.title}</div>
                    <div className="muted text-sm">{EVENT_LABELS[r.eventType as EventType]}, {fmtDate(r.input.date)}</div>
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
