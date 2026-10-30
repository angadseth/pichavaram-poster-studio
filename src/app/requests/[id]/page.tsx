import Link from "next/link";
import { notFound } from "next/navigation";
import { fmtDate, fmtStamp, Status } from "@/components/status";
import { canView, getRequest } from "@/lib/pipeline";
import { requireUser } from "@/lib/session";
import { getTemplate } from "@/poster/registry";
import { EVENT_LABELS } from "@/poster/types";
import { fmtTime } from "@/poster/util";
import { Resend } from "./resend";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const r = await getRequest(id);
  if (!r || !canView(user, r)) notFound();
  const i = r.input;
  let design = r.templateId;
  try {
    design = getTemplate(r.templateId).name;
  } catch {}
  const rows: [string, string][] = [
    ["Event", EVENT_LABELS[i.eventType]],
    ["When", `${fmtDate(i.date)}, ${fmtTime(i.startTime)}${i.endTime ? ` – ${fmtTime(i.endTime)}` : ""} IST`],
    [i.mode === "online" ? "Meeting link" : "Venue", (i.mode === "online" ? i.meetLink : i.venue) ?? ""],
    ["Houses", `Pichavaram${i.houseIds.length ? ` + ${i.houseIds.length} collaborating` : ""}`],
    ["Hosted by", r.hostName],
    ["Design", design],
    ["Requested", fmtStamp(r.createdAt)],
  ];
  if (r.renderMs) rows.push(["Render time", `${(r.renderMs / 1000).toFixed(1)}s`]);

  return (
    <div className="shell grid items-start gap-10 pt-6 md:grid-cols-[minmax(0,460px)_1fr]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/api/posters/${r.id}`} alt={`${r.title} poster`} className="aspect-[4/5] w-full rounded-2xl border border-[var(--line)] bg-[var(--lagoon)]" />
      <div>
        <Link href={user.role === "admin" && r.email !== user.email ? "/admin" : "/requests"} className="muted text-sm hover:text-[var(--pearl)]">
          Back to posters
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="display text-4xl sm:text-5xl">{r.title}</h1>
          <Status status={r.status} />
        </div>
        <dl className="mt-8 grid grid-cols-[140px_1fr] gap-y-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="muted">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>
        {r.status === "failed" ? <p className="mt-6 text-sm text-[var(--danger)]">The email didn&apos;t go through. Download the poster or retry.</p> : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn btn-brass" href={`/api/posters/${r.id}?download=1`}>Download PNG</a>
          <Resend id={r.id} label={r.status === "sent" ? "Email it again" : "Retry email"} />
        </div>
      </div>
    </div>
  );
}
