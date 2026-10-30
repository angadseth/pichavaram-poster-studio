import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { placeholderLogo } from "@/poster/house-logos";
import { renderPoster } from "@/poster/render";
import { isEligible, newSeed, selectTemplate } from "@/poster/select";
import type { Choice, PosterData, PosterHouse } from "@/poster/types";
import { describeWhen } from "@/poster/util";
import type { User } from "./auth";
import { db, ensureSchema } from "./db";
import { posterMail, sendMail } from "./mail";
import type { RequestInput } from "./validation";

export type House = { id: string; name: string; color: string; logo: string; custom: boolean };

export async function listHouses(): Promise<House[]> {
  await ensureSchema();
  const r = await db().execute("SELECT id, name, color, logo FROM houses ORDER BY sort, name");
  return r.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    logo: row.logo ? String(row.logo) : placeholderLogo(String(row.name), String(row.color)),
    custom: Boolean(row.logo),
  }));
}

/** Pichavaram first, then the selected collaborators in house order; unknown ids dropped. */
export async function resolveHouses(ids: string[]): Promise<PosterHouse[]> {
  const all = await listHouses();
  const wanted = new Set(["pichavaram", ...ids]);
  return all.filter((h) => wanted.has(h.id)).map((h) => ({ name: h.name, logo: h.logo }));
}

export async function toPosterData(input: RequestInput): Promise<PosterData> {
  return {
    eventType: input.eventType,
    title: input.title,
    tagline: input.tagline,
    description: input.description,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    mode: input.mode,
    meetLink: input.meetLink,
    venue: input.venue,
    highlights: input.highlights,
    houses: await resolveHouses(input.houseIds),
    region: input.region,
  };
}

async function recentTemplates(email: string, n = 2): Promise<string[]> {
  const r = await db().execute({
    sql: "SELECT template_id FROM requests WHERE email = ? ORDER BY created_at DESC LIMIT ?",
    args: [email, n],
  });
  return r.rows.map((row) => String(row.template_id));
}

/**
 * Resolve what to render: a client-supplied choice (what they saw in preview)
 * if it is valid for this event, otherwise a fresh pick.
 */
export async function resolveChoice(
  data: PosterData,
  email: string,
  want: Partial<Choice> & { avoid?: string[] },
  notes?: string,
): Promise<Choice> {
  const seed = Number.isInteger(want.seed) && want.seed! >= 0 ? want.seed! : newSeed();
  if (want.templateId && want.paletteId && isEligible(want.templateId, data)) {
    return { templateId: want.templateId, paletteId: want.paletteId, seed };
  }
  const avoid = [...(want.avoid ?? []), ...(await recentTemplates(email))];
  return { ...selectTemplate(data, { seed, avoid, notes }), seed };
}

export async function previewPoster(user: User, input: RequestInput, want: Partial<Choice> & { avoid?: string[] }) {
  await ensureSchema();
  const data = await toPosterData(input);
  const choice = await resolveChoice(data, user.email, want, input.notes);
  const { png, ms, mime } = await renderPoster(data, choice, { width: 720, format: "jpeg" });
  return { choice, ms, image: `data:${mime};base64,${png.toString("base64")}` };
}

export type RequestRow = {
  id: string;
  email: string;
  eventType: string;
  title: string;
  hostName: string;
  notes: string;
  templateId: string;
  paletteId: string;
  seed: number;
  status: "pending" | "sent" | "failed";
  error: string | null;
  renderMs: number | null;
  createdAt: number;
  sentAt: number | null;
  input: RequestInput;
};

function rowToRequest(row: Record<string, unknown>): RequestRow {
  return {
    id: String(row.id),
    email: String(row.email),
    eventType: String(row.event_type),
    title: String(row.title),
    hostName: String(row.host_name),
    notes: String(row.notes ?? ""),
    templateId: String(row.template_id),
    paletteId: String(row.palette_id),
    seed: Number(row.seed),
    status: row.status as RequestRow["status"],
    error: row.error ? String(row.error) : null,
    renderMs: row.render_ms == null ? null : Number(row.render_ms),
    createdAt: Number(row.created_at),
    sentAt: row.sent_at == null ? null : Number(row.sent_at),
    input: JSON.parse(String(row.input_json)),
  };
}

// Every column except the thumbnail blob.
const COLS =
  "id, email, event_type, title, input_json, host_name, notes, template_id, palette_id, seed, status, error, render_ms, created_at, sent_at";

export async function getRequest(id: string): Promise<RequestRow | null> {
  await ensureSchema();
  const r = await db().execute({ sql: `SELECT ${COLS} FROM requests WHERE id = ?`, args: [id] });
  return r.rows[0] ? rowToRequest(r.rows[0] as Record<string, unknown>) : null;
}

export async function listRequests(email?: string, limit = 200): Promise<RequestRow[]> {
  await ensureSchema();
  const r = email
    ? await db().execute({ sql: `SELECT ${COLS} FROM requests WHERE email = ? ORDER BY created_at DESC LIMIT ?`, args: [email, limit] })
    : await db().execute({ sql: `SELECT ${COLS} FROM requests ORDER BY created_at DESC LIMIT ?`, args: [limit] });
  return r.rows.map((row) => rowToRequest(row as Record<string, unknown>));
}

export function canView(user: User, req: RequestRow): boolean {
  return user.role === "admin" || req.email === user.email;
}

export function posterFilename(req: Pick<RequestRow, "title" | "input">): string {
  const slug = req.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "poster";
  return `${slug}-${req.input.date}.png`;
}

/** Logos are resolved at render time, so rows stay small and new logos apply everywhere. */
export async function renderRequest(req: RequestRow) {
  return renderPoster(await toPosterData(req.input), { templateId: req.templateId, paletteId: req.paletteId, seed: req.seed });
}

/** Render + email; records the outcome on the row. Never throws. */
export async function deliver(req: RequestRow, appUrl?: string): Promise<RequestRow> {
  try {
    const { png, ms } = await renderRequest(req);
    const thumb = await sharp(png).resize(360).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
    await db().execute({ sql: "UPDATE requests SET thumb = ?, render_ms = ? WHERE id = ?", args: [thumb.toString("base64"), ms, req.id] });
    const w = describeWhen(req.input);
    await sendMail(
      posterMail({
        to: req.email,
        title: req.title,
        when: `${w.weekdayLong}, ${w.day} ${w.monthLong} ${w.year} · ${w.time}`,
        png,
        filename: posterFilename(req),
        link: appUrl ? `${appUrl}/requests/${req.id}` : undefined,
      }),
    );
    const sentAt = Date.now();
    await db().execute({
      sql: "UPDATE requests SET status = 'sent', error = NULL, render_ms = ?, sent_at = ? WHERE id = ?",
      args: [ms, sentAt, req.id],
    });
    return { ...req, status: "sent", error: null, renderMs: ms, sentAt };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[deliver] request ${req.id} failed:`, err);
    await db().execute({ sql: "UPDATE requests SET status = 'failed', error = ? WHERE id = ?", args: [error.slice(0, 500), req.id] });
    return { ...req, status: "failed", error };
  }
}

export async function createRequest(
  user: User,
  input: RequestInput,
  want: Partial<Choice>,
  appUrl?: string,
): Promise<RequestRow> {
  await ensureSchema();
  const choice = await resolveChoice(await toPosterData(input), user.email, want, input.notes);
  const req: RequestRow = {
    id: randomBytes(9).toString("base64url"),
    email: user.email,
    eventType: input.eventType,
    title: input.title,
    hostName: input.hostName,
    notes: input.notes ?? "",
    ...choice,
    status: "pending",
    error: null,
    renderMs: null,
    createdAt: Date.now(),
    sentAt: null,
    input,
  };
  await db().execute({
    sql: `INSERT INTO requests (id, email, event_type, title, input_json, host_name, notes, template_id, palette_id, seed, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
    args: [
      req.id, req.email, req.eventType, req.title, JSON.stringify(input),
      req.hostName, req.notes, req.templateId, req.paletteId, req.seed, req.createdAt,
    ],
  });
  return deliver(req, appUrl);
}

export async function getThumb(id: string): Promise<Buffer | null> {
  await ensureSchema();
  const r = await db().execute({ sql: "SELECT thumb FROM requests WHERE id = ?", args: [id] });
  const t = r.rows[0]?.thumb;
  return t ? Buffer.from(String(t), "base64") : null;
}
