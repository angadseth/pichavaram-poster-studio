import { appUrl, fail, guard, json, readJson } from "@/lib/api";
import { normalizeEmail } from "@/lib/auth";
import { assign, getPerson, getRequest } from "@/lib/requests";

/** Admin: give a request to a designer (or another admin). Body: { assignee: email } */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await guard("admin");
  if (admin instanceof Response) return admin;
  const { id } = await params;
  const r = await getRequest(id);
  if (!r) return fail(404, "Request not found.");
  const body = await readJson(req);
  const email = typeof body?.assignee === "string" ? normalizeEmail(body.assignee) : "";
  const designer = email ? await getPerson(email) : null;
  if (!designer || designer.role === "rc") return fail(400, "Pick a designer from the team list.");
  const { mailed } = await assign(r, designer, appUrl(req));
  return json({ ok: true, mailed });
}
