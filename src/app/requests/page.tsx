import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { RequestGrid } from "@/components/request-grid";
import { listRequests } from "@/lib/requests";
import { requireUser } from "@/lib/session";

export const metadata = { title: "My requests · Pichavaram Poster Studio" };

export default async function RequestsPage() {
  const user = await requireUser();
  const rows = await listRequests({ email: user.email });
  return (
    <div className="shell pt-12">
      <AutoRefresh active={rows.some((r) => r.status !== "delivered")} every={20000} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="display text-[clamp(44px,7vw,88px)]">My <em>requests</em></h1>
        <Link href="/studio" className="btn btn-brass">Request a poster</Link>
      </div>
      <div className="rule mt-6 mb-10" />
      {rows.length === 0 ? (
        <div className="py-20 text-center">
          <p className="display text-4xl">Nothing here yet</p>
          <p className="muted mt-3">Ask for your first poster; the design team emails it to you when it&apos;s ready.</p>
          <Link href="/studio" className="btn btn-brass mt-8">Request a poster</Link>
        </div>
      ) : (
        <RequestGrid rows={rows} />
      )}
    </div>
  );
}
