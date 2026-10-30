import { fail, guard, json, readJson } from "@/lib/api";
import { normalizeEmail } from "@/lib/auth";
import { db, ensureSchema } from "@/lib/db";

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export async function GET() {
  const user = await guard("admin");
  if (user instanceof Response) return user;
  await ensureSchema();
  const r = await db().execute("SELECT email, name, region, role, active, created_at FROM users ORDER BY role, region, email");
  return json(r.rows);
}

/**
 * Body: { email, name?, region?, role?, active? } to add/update one person, or
 * { bulk: "email, name, region\n..." } to import many RCs at once.
 */
export async function POST(req: Request) {
  const admin = await guard("admin");
  if (admin instanceof Response) return admin;
  await ensureSchema();
  const body = await readJson(req);
  if (!body) return fail(400, "Invalid request.");

  type Row = { email: string; name: string; region: string; role: "rc" | "admin"; active: number };
  const rows: Row[] = [];
  const bad: string[] = [];
  if (typeof body.bulk === "string") {
    for (const line of body.bulk.split(/\r?\n/)) {
      const [email = "", name = "", region = ""] = line.split(/[,\t]/).map((x) => x.trim());
      if (!email) continue;
      if (!EMAIL.test(email)) bad.push(email);
      else rows.push({ email: normalizeEmail(email), name: name.slice(0, 60), region: region.slice(0, 40), role: "rc", active: 1 });
    }
  } else {
    const email = typeof body.email === "string" ? body.email.trim() : "";
    if (!EMAIL.test(email)) return fail(400, "Enter a valid email.");
    rows.push({
      email: normalizeEmail(email),
      name: typeof body.name === "string" ? body.name.trim().slice(0, 60) : "",
      region: typeof body.region === "string" ? body.region.trim().slice(0, 40) : "",
      role: body.role === "admin" ? "admin" : "rc",
      active: body.active === false ? 0 : 1,
    });
  }
  if (rows.some((r) => r.email === admin.email && (r.active === 0 || r.role !== "admin"))) {
    return fail(400, "You can't remove your own admin access.");
  }
  if (rows.length === 0) return fail(400, bad.length ? `Invalid emails: ${bad.join(", ")}` : "Nothing to import.");
  await db().batch(
    rows.map((r) => ({
      sql: `INSERT INTO users (email, name, region, role, active, created_at) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET name = excluded.name, region = excluded.region, role = excluded.role, active = excluded.active`,
      args: [r.email, r.name, r.region, r.role, r.active, Date.now()],
    })),
    "write",
  );
  return json({ ok: true, saved: rows.length, invalid: bad });
}

export async function DELETE(req: Request) {
  const admin = await guard("admin");
  if (admin instanceof Response) return admin;
  const email = normalizeEmail(new URL(req.url).searchParams.get("email") ?? "");
  if (!email) return fail(400, "Missing email.");
  if (email === admin.email) return fail(400, "You can't remove yourself.");
  await ensureSchema();
  await db().batch(
    [
      { sql: "DELETE FROM users WHERE email = ?", args: [email] },
      { sql: "DELETE FROM otps WHERE email = ?", args: [email] },
    ],
    "write",
  );
  return json({ ok: true });
}
