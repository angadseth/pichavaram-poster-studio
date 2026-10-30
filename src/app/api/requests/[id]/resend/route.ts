import { appUrl, fail, guard, json } from "@/lib/api";
import { canView, deliver, getRequest } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (user instanceof Response) return user;
  const { id } = await params;
  const row = await getRequest(id);
  if (!row || !canView(user, row)) return fail(404, "Request not found.");
  const r = await deliver(row, appUrl(req));
  return r.status === "sent" ? json({ ok: true }) : fail(502, "Email failed again. Please try later.");
}
