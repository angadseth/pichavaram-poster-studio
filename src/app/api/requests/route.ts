import { appUrl, fail, guard, json, readChoice, readJson } from "@/lib/api";
import { db } from "@/lib/db";
import { after } from "next/server";
import { createRequest, deliver, listRequests } from "@/lib/pipeline";
import { parseRequest } from "@/lib/validation";

export const maxDuration = 60;

const DAILY_LIMIT = 30;

export async function GET() {
  const user = await guard();
  if (user instanceof Response) return user;
  const rows = await listRequests(user.email);
  return json(rows.map(({ input, ...r }) => ({ ...r, date: input.date })));
}

export async function POST(req: Request) {
  const user = await guard();
  if (user instanceof Response) return user;
  const body = await readJson(req);
  const parsed = parseRequest(body?.input);
  if (!parsed.ok) return fail(400, "Some details need fixing.", { errors: parsed.errors });

  const recent = await db().execute({
    sql: "SELECT COUNT(*) AS n FROM requests WHERE email = ? AND created_at > ?",
    args: [user.email, Date.now() - 24 * 3600 * 1000],
  });
  if (Number(recent.rows[0].n) >= DAILY_LIMIT) return fail(429, "Daily limit reached. Try again tomorrow.");

  const r = await createRequest(user, parsed.data, readChoice(body?.choice));
  // Render and email after the response, so the requester isn't kept waiting on the page.
  const base = appUrl(req);
  after(() => deliver(r, base));
  return json({ id: r.id, status: r.status }, 202);
}
