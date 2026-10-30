import Link from "next/link";
import { notFound } from "next/navigation";
import { Status } from "@/components/status";
import { EVENT_LABELS, fmtDate, fmtStamp } from "@/lib/events";
import { briefOf, canDeliver, canView, getPerson, getRequest, listDesigners } from "@/lib/requests";
import { requireUser } from "@/lib/session";
import { AssignForm, Resend, UploadPoster } from "./actions";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = await getRequest(id);
  if (!r || !canView(user, r)) notFound();
  const isAdmin = user.role === "admin";
  const [{ rows, houses }, designers, assignee] = await Promise.all([
    briefOf(r),
    isAdmin ? listDesigners() : Promise.resolve([]),
    r.assignee ? getPerson(r.assignee) : Promise.resolve(null),
  ]);
  const mine = r.email === user.email;
  const back = mine ? "/requests" : isAdmin ? "/admin" : "/work";

  const timeline: [string, string | null][] = [
    ["Requested", fmtStamp(r.createdAt)],
    ["Assigned", r.assignedAt ? `${fmtStamp(r.assignedAt)}${assignee ? `, to ${assignee.name || assignee.email}` : ""}` : null],
    ["Delivered", r.deliveredAt ? fmtStamp(r.deliveredAt) : null],
  ];

  return (
    <div className="shell grid items-start gap-12 pt-12 lg:grid-cols-[minmax(0,440px)_1fr]">
      <div className="lg:sticky lg:top-24">
        {r.hasPoster ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/posters/${r.id}`} alt={`${r.title} poster`} className="w-full rounded-md bg-[var(--ink-3)] shadow-[0_0_0_1px_var(--line),0_50px_90px_-40px_#000]" />
            <div className="mt-5 flex flex-wrap gap-3">
              <a className="btn btn-brass" href={`/api/posters/${r.id}?download=1`}>Download poster</a>
              <Resend id={r.id} />
            </div>
            {r.mailError ? <p className="mt-3 text-sm text-[var(--danger)]">The last email didn&apos;t go through. Try “Email it again”.</p> : null}
          </>
        ) : (
          <div className="ticket aspect-[4/5] w-full">
            <span className="mono text-[var(--mute)]">{EVENT_LABELS[r.eventType]}</span>
            <span className="display mt-auto text-[52px] leading-[.95]">{r.title}</span>
            <span className="mt-4 text-[var(--ivory-2)]">{fmtDate(r.input.date)}</span>
            <span className="mt-6 text-sm text-[var(--gold-hi)]">
              {r.status === "new" ? "Waiting for a designer" : "Being designed"}
            </span>
          </div>
        )}
      </div>

      <div>
        <Link href={back} className="muted text-sm hover:text-[var(--ivory)]">Back</Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <h1 className="display text-[clamp(40px,6vw,72px)]">{r.title}</h1>
          <Status status={r.status} />
        </div>
        {mine && r.status !== "delivered" ? (
          <p className="muted mt-3 max-w-xl">The Pichavaram design team is on it. The poster comes to {r.email} as soon as it&apos;s ready.</p>
        ) : null}
        {!mine ? <p className="muted mt-3">Requested by {r.email}</p> : null}

        {isAdmin ? (
          <section className="panel mt-8 p-6">
            <h2 className="display text-3xl">Designer</h2>
            <p className="muted mt-1 mb-5 text-sm">They get this brief by email, with the house crests attached.</p>
            <AssignForm id={r.id} designers={designers.map(({ email, name, role }) => ({ email, name, role }))} current={r.assignee} />
          </section>
        ) : null}

        {canDeliver(user, r) && r.assignee ? (
          <section className="panel mt-6 p-6">
            <h2 className="display text-3xl">{r.hasPoster ? "Replace the poster" : "Upload the poster"}</h2>
            <p className="muted mt-1 mb-5 text-sm">It is emailed to {r.email} as soon as you send it.</p>
            <UploadPoster id={r.id} replacing={r.hasPoster} rcEmail={r.email} />
          </section>
        ) : null}

        <h2 className="display mt-12 text-3xl">The brief</h2>
        <dl className="mt-4 grid grid-cols-[130px_1fr] gap-y-3 border-t border-[var(--line)] pt-5 text-[15px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="muted">{k}</dt>
              <dd className="break-words">{k === "Meeting link" ? <a className="underline decoration-[var(--gold)] underline-offset-4" href={v}>{v}</a> : v}</dd>
            </div>
          ))}
          <dt className="muted">Hosted by</dt>
          <dd>{r.hostName} <span className="muted text-sm">(for the records, not for the poster)</span></dd>
        </dl>

        <h3 className="mt-10 text-sm text-[var(--ivory-2)]">Crests for the poster</h3>
        <ul className="mt-4 flex flex-wrap gap-4">
          {houses.map((h) => (
            <li key={h.id}>
              <a href={h.logo.startsWith("/crests/") ? h.logo.replace(".webp", ".png") : h.logo} download={`${h.id}-crest.png`} className="flex flex-col items-center gap-2 text-center" title={`Download the ${h.name} crest`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={h.logo} alt="" width={64} height={64} className="crest" />
                <span className="muted text-xs">{h.name.replace(/ House$/, "")}</span>
              </a>
            </li>
          ))}
        </ul>

        <ol className="mt-12 flex flex-col gap-3 border-t border-[var(--line)] pt-6 text-sm">
          {timeline.map(([k, v]) => (
            <li key={k} className="flex gap-4">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${v ? "bg-[var(--gold)]" : "bg-[var(--line-2)]"}`} />
              <span className="w-24 shrink-0 text-[var(--ivory-2)]">{k}</span>
              <span className="muted">{v ?? "Not yet"}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
