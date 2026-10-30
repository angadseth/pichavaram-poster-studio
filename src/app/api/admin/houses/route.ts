import sharp from "sharp";
import { fail, guard, json, readJson } from "@/lib/api";
import { db, ensureSchema } from "@/lib/db";
import { listHouses } from "@/lib/requests";

const MAX_UPLOAD = 2 * 1024 * 1024;

/** Normalise any uploaded logo (png/jpg/webp/svg) to a 320px transparent PNG data URI. */
async function normaliseLogo(dataUri: string): Promise<string> {
  const m = /^data:image\/(png|jpe?g|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/.exec(dataUri);
  if (!m) throw new Error("Upload a PNG, JPG, WEBP or SVG image.");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_UPLOAD) throw new Error("Logo must be under 2 MB.");
  const png = await sharp(buf, { density: 300 })
    .resize(320, 320, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export async function GET() {
  const user = await guard("admin");
  if (user instanceof Response) return user;
  return json(await listHouses());
}

/**
 * Body: { id, logo: dataUri | null, name? } updates a house (null logo = back to placeholder),
 * or { create: { name, color } } adds a new one.
 */
export async function POST(req: Request) {
  const admin = await guard("admin");
  if (admin instanceof Response) return admin;
  await ensureSchema();
  const body = await readJson(req);
  if (!body) return fail(400, "Invalid request.");

  if (body.create && typeof body.create === "object") {
    const c = body.create as Record<string, unknown>;
    const name = typeof c.name === "string" ? c.name.trim().slice(0, 40) : "";
    if (name.length < 2) return fail(400, "Enter the house name.");
    const full = /house$/i.test(name) ? name : `${name} House`;
    const id = full.toLowerCase().replace(/ house$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const color = typeof c.color === "string" && /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : "#3A4A5C";
    const r = await db().execute({
      sql: "INSERT OR IGNORE INTO houses (id, name, color, logo, sort) VALUES (?, ?, ?, NULL, (SELECT COALESCE(MAX(sort), 0) + 1 FROM houses))",
      args: [id, full, color],
    });
    if (r.rowsAffected === 0) return fail(409, "That house already exists.");
    return json({ ok: true, id });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return fail(400, "Missing house id.");
  let logo: string | null = null;
  if (typeof body.logo === "string") {
    try {
      logo = await normaliseLogo(body.logo);
    } catch (err) {
      return fail(400, err instanceof Error ? err.message : "Couldn't read that image.");
    }
  }
  const name = typeof body.name === "string" && body.name.trim().length >= 2 ? body.name.trim().slice(0, 40) : null;
  const r = await db().execute({
    sql: "UPDATE houses SET logo = ?, name = COALESCE(?, name) WHERE id = ?",
    args: [logo, name, id],
  });
  if (r.rowsAffected === 0) return fail(404, "House not found.");
  return json({ ok: true });
}
