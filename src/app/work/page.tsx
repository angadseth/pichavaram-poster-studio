import { RequestGrid } from "@/components/request-grid";
import { fmtDate } from "@/lib/events";
import { listRequests } from "@/lib/requests";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "My work · Pichavaram Poster Studio" };

export default async function WorkPage() {
  const user = await requireStaff();
  const rows = await listRequests({ assignee: user.email });
  // soonest event first among the open ones
  const open = rows.filter((r) => r.status !== "delivered").sort((a, b) => a.input.date.localeCompare(b.input.date));
  const done = rows.filter((r) => r.status === "delivered");
  return (
    <div className="shell pt-12">
      <h1 className="display text-[clamp(44px,7vw,88px)]">My <em>work</em></h1>
      <p className="muted mt-3">Posters assigned to you. Open one, read the brief, and upload the poster; it is emailed to the RC.</p>
      <div className="rule mt-6 mb-10" />
      {open.length === 0 ? (
        <p className="display py-10 text-3xl text-[var(--ivory-2)]">Nothing to design right now.</p>
      ) : (
        <RequestGrid rows={open} who={(r) => `Event ${fmtDate(r.input.date)}`} />
      )}
      {done.length ? (
        <>
          <h2 className="display mt-20 text-4xl">Delivered</h2>
          <div className="rule mt-4 mb-10" />
          <RequestGrid rows={done} />
        </>
      ) : null}
    </div>
  );
}
