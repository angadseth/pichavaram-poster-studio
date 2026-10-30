import Link from "next/link";
import { Status } from "@/components/status";
import { EVENT_LABELS, fmtDate } from "@/lib/events";
import type { RequestRow } from "@/lib/requests";

/** Poster cards: the delivered poster, or a ticket for one still being made. */
export function RequestGrid({ rows, who }: { rows: RequestRow[]; who?: (r: RequestRow) => string | null }) {
  return (
    <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((r) => (
        <li key={r.id}>
          <Link href={`/requests/${r.id}`} className="group block">
            {r.hasPoster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/posters/${r.id}?thumb=1`}
                alt={`${r.title} poster`}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-md bg-[var(--ink-3)] object-cover shadow-[0_0_0_1px_var(--line)] transition duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_0_0_1px_var(--gold),0_30px_60px_-30px_#000]"
              />
            ) : (
              <div className="ticket aspect-[4/5] w-full transition duration-500 group-hover:-translate-y-1">
                <span className="mono text-[var(--mute)]">{EVENT_LABELS[r.eventType]}</span>
                <span className="display mt-auto text-[34px] leading-none">{r.title}</span>
                <span className="mt-3 text-sm text-[var(--ivory-2)]">{fmtDate(r.input.date)}</span>
              </div>
            )}
            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="display truncate text-2xl">{r.title}</div>
                <div className="muted truncate text-sm">{who?.(r) ?? `${EVENT_LABELS[r.eventType]}, ${fmtDate(r.input.date)}`}</div>
              </div>
              <Status status={r.status} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
