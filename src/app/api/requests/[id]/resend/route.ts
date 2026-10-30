import { appUrl, fail, guard, json } from "@/lib/api";
import { canDeliver, getRequest, mailPoster } from "@/lib/requests";

/** Email the delivered poster to the RC again. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (user instanceof Response) return user;
  const { id } = await params;
  const r = await getRequest(id);
  if (!r || !(canDeliver(user, r) || r.email === user.email)) return fail(404, "Request not found.");
  if (!r.hasPoster) return fail(400, "No poster uploaded yet.");
  const { mailed } = await mailPoster(r, appUrl(req));
  return mailed ? json({ ok: true }) : fail(502, "The email didn't go through. Try again in a minute.");
}
