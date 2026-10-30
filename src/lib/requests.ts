import { randomBytes } from "node:crypto";
import sharp from "sharp";
import type { User } from "./auth";
import { db, ensureSchema } from "./db";
import { EVENT_LABELS, fmtWhen, type EventType } from "./events";
import { crestPng, crestUrl } from "./houses";
import { assignedMail, deliveredMail, newRequestMail, sendMail, type MailAttachment } from "./mail";
import type { RequestInput } from "./validation";

export type House = { id: string; name: string; color: string; logo: string; custom: boolean };

export async function listHouses(): Promise<House[]> {
  await ensureSchema();
  const r = await db().execute("SELECT id, name, color, logo FROM houses ORDER BY sort, name");
  return r.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    color: String(row.color),
    logo: row.logo ? String(row.logo) : crestUrl(String(row.id), String(row.name), String(row.color)),
    custom: Boolean(row.logo),
  }));
}

export type Status = "new" | "assigned" | "delivered";

export type RequestRow = {
  id: string;
  email: string;
  eventType: EventType;
  title: string;
  hostName: string;
  notes: string;
  status: Status;
  assignee: string | null;
  assignedAt: number | null;
  deliveredAt: number | null;
  mailError: string | null;
  hasPoster: boolean;
  createdAt: number;
  input: RequestInput;
};

function rowToRequest(row: Record<string, unknown>): RequestRow {
  return {
    id: String(row.id),
    email: String(row.email),
    eventType: String(row.event_type) as EventType,
    title: String(row.title),
    hostName: String(row.host_name),
    notes: String(row.notes ?? ""),
    status: row.status as Status,
    assignee: row.assignee ? String(row.assignee) : null,
    assignedAt: row.assigned_at == null ? null : Number(row.assigned_at),
    deliveredAt: row.delivered_at == null ? null : Number(row.delivered_at),
    mailError: row.mail_error ? String(row.mail_error) : null,
    hasPoster: Boolean(row.has_poster),
    createdAt: Number(row.created_at),
    input: JSON.parse(String(row.input_json)),
  };
}

// Every column except the image blobs.
const COLS =
  "id, email, event_type, title, input_json, host_name, notes, status, assignee, assigned_at, delivered_at, mail_error, created_at, poster IS NOT NULL AS has_poster";

export async function getRequest(id: string): Promise<RequestRow | null> {
  await ensureSchema();
  const r = await db().execute({ sql: `SELECT ${COLS} FROM poster_requests WHERE id = ?`, args: [id] });
  return r.rows[0] ? rowToRequest(r.rows[0] as Record<string, unknown>) : null;
}

/** Newest first. Filter by requester or by assignee; no filter = everything (admin). */
export async function listRequests(by: { email?: string; assignee?: string } = {}, limit = 300): Promise<RequestRow[]> {
  await ensureSchema();
  const where = by.email ? "WHERE email = ?" : by.assignee ? "WHERE assignee = ?" : "";
  const args = by.email ? [by.email] : by.assignee ? [by.assignee] : [];
  const r = await db().execute({ sql: `SELECT ${COLS} FROM poster_requests ${where} ORDER BY created_at DESC LIMIT ?`, args: [...args, limit] });
  return r.rows.map((row) => rowToRequest(row as Record<string, unknown>));
}

/** The requester, the assigned designer and admins can open a request. */
export function canView(user: User, req: RequestRow): boolean {
  return user.role === "admin" || req.email === user.email || req.assignee === user.email;
}

/** The assigned designer and admins can upload the poster. */
export function canDeliver(user: User, req: RequestRow): boolean {
  return user.role === "admin" || (req.assignee === user.email && user.role !== "rc");
}

export type Person = { email: string; name: string; region: string; role: User["role"] };

export async function getPerson(email: string): Promise<Person | null> {
  const r = await db().execute({ sql: "SELECT email, name, region, role FROM people WHERE email = ? AND active = 1", args: [email] });
  const row = r.rows[0];
  return row ? { email: String(row.email), name: String(row.name), region: String(row.region), role: row.role as Person["role"] } : null;
}

/** People who can be given a request: designers and admins. */
export async function listDesigners(): Promise<Person[]> {
  await ensureSchema();
  const r = await db().execute("SELECT email, name, region, role FROM people WHERE active = 1 AND role IN ('designer','admin') ORDER BY role DESC, name, email");
  return r.rows.map((row) => ({ email: String(row.email), name: String(row.name), region: String(row.region), role: row.role as Person["role"] }));
}

async function admins(): Promise<string[]> {
  const r = await db().execute("SELECT email FROM people WHERE active = 1 AND role = 'admin'");
  return r.rows.map((row) => String(row.email));
}

/** Plain-language brief of a request, used in emails and on the request page. */
export async function briefOf(req: Pick<RequestRow, "eventType" | "title" | "input" | "notes" | "hostName">) {
  const houses = await listHouses();
  const chosen = houses.filter((h) => h.id === "pichavaram" || req.input.houseIds.includes(h.id));
  const i = req.input;
  const rows: [string, string][] = [
    ["Event", EVENT_LABELS[req.eventType]],
    ["Title", req.title],
  ];
  if (i.tagline) rows.push(["Tagline", i.tagline]);
  rows.push(["When", fmtWhen(i)]);
  rows.push(i.mode === "online" ? ["Meeting link", i.meetLink ?? ""] : ["Venue", i.venue ?? ""]);
  rows.push(["Houses", chosen.map((h) => h.name.replace(/ House$/, "")).join(", ")]);
  if (i.highlights.length) rows.push(["Highlights", i.highlights.join(", ")]);
  if (i.region) rows.push(["Region", i.region]);
  if (req.notes) rows.push(["Feel / notes", req.notes]);
  rows.push(["Hosted by", req.hostName]);
  return { rows, houses: chosen };
}

/** The chosen houses' crests as files, so the designer has them at hand. */
async function crestFiles(houses: House[]): Promise<MailAttachment[]> {
  const out: MailAttachment[] = [];
  for (const h of houses) {
    let content: Buffer | null = null;
    if (h.custom && h.logo.startsWith("data:")) content = Buffer.from(h.logo.split(",")[1] ?? "", "base64");
    else content = crestPng(h.id);
    if (content) out.push({ filename: `${h.id}-crest.png`, content, contentType: "image/png" });
  }
  return out;
}

export async function createRequest(user: User, input: RequestInput): Promise<RequestRow> {
  await ensureSchema();
  const req: RequestRow = {
    id: randomBytes(9).toString("base64url"),
    email: user.email,
    eventType: input.eventType,
    title: input.title,
    hostName: input.hostName,
    notes: input.notes ?? "",
    status: "new",
    assignee: null,
    assignedAt: null,
    deliveredAt: null,
    mailError: null,
    hasPoster: false,
    createdAt: Date.now(),
    input,
  };
  await db().execute({
    sql: `INSERT INTO poster_requests (id, email, event_type, title, input_json, host_name, notes, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    args: [req.id, req.email, req.eventType, req.title, JSON.stringify(input), req.hostName, req.notes, req.createdAt],
  });
  return req;
}

/** Tell the admins a new request came in. Never throws: the request is already saved. */
export async function notifyAdmins(req: RequestRow, appUrl: string) {
  try {
    const to = (await admins()).filter((e) => e !== req.email);
    if (!to.length) return;
    const { rows } = await briefOf(req);
    await sendMail(newRequestMail({ to: to.join(", "), from: req.email, title: req.title, rows, link: `${appUrl}/requests/${req.id}` }));
  } catch (err) {
    console.error(`[notify] request ${req.id}:`, err);
  }
}

export async function assign(req: RequestRow, designer: Person, appUrl: string): Promise<{ mailed: boolean }> {
  const now = Date.now();
  await db().execute({
    sql: "UPDATE poster_requests SET assignee = ?, assigned_at = ?, status = CASE WHEN status = 'delivered' THEN status ELSE 'assigned' END WHERE id = ?",
    args: [designer.email, now, req.id],
  });
  try {
    const { rows, houses } = await briefOf(req);
    await sendMail(
      assignedMail({
        to: designer.email,
        name: designer.name,
        title: req.title,
        rows,
        link: `${appUrl}/requests/${req.id}`,
        attachments: await crestFiles(houses),
      }),
    );
    return { mailed: true };
  } catch (err) {
    console.error(`[assign] request ${req.id}:`, err);
    return { mailed: false };
  }
}

export const MAX_POSTER_BYTES = 4 * 1024 * 1024;

export function posterFilename(req: Pick<RequestRow, "title" | "input">, mime: string): string {
  const slug = req.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "poster";
  return `${slug}-${req.input.date}.${mime === "image/png" ? "png" : "jpg"}`;
}

/** Store the designer's poster and email it to the requester. */
export async function deliver(req: RequestRow, file: Buffer, appUrl: string): Promise<{ mailed: boolean }> {
  const meta = await sharp(file).metadata();
  const mime = meta.format === "png" ? "image/png" : meta.format === "jpeg" ? "image/jpeg" : null;
  // anything else (webp, heic…) is converted so every inbox can open it
  const poster = mime ? file : await sharp(file).rotate().jpeg({ quality: 92 }).toBuffer();
  const posterMime = mime ?? "image/jpeg";
  const thumb = await sharp(poster).rotate().resize(480).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  const now = Date.now();
  await db().execute({
    sql: "UPDATE poster_requests SET poster = ?, poster_mime = ?, thumb = ?, status = 'delivered', delivered_at = ?, mail_error = NULL WHERE id = ?",
    args: [poster.toString("base64"), posterMime, thumb.toString("base64"), now, req.id],
  });
  return mailPoster({ ...req, deliveredAt: now }, appUrl);
}

/** (Re)send the stored poster to the requester. */
export async function mailPoster(req: RequestRow, appUrl: string): Promise<{ mailed: boolean }> {
  const p = await getPoster(req.id);
  if (!p) return { mailed: false };
  try {
    const preview = await sharp(p.data).rotate().resize(720).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    await sendMail(
      deliveredMail({
        to: req.email,
        title: req.title,
        when: fmtWhen(req.input),
        poster: p.data,
        mime: p.mime,
        preview,
        filename: posterFilename(req, p.mime),
        link: `${appUrl}/requests/${req.id}`,
      }),
    );
    await db().execute({ sql: "UPDATE poster_requests SET mail_error = NULL WHERE id = ?", args: [req.id] });
    return { mailed: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[deliver] request ${req.id}:`, err);
    await db().execute({ sql: "UPDATE poster_requests SET mail_error = ? WHERE id = ?", args: [msg.slice(0, 500), req.id] });
    return { mailed: false };
  }
}

export async function getPoster(id: string): Promise<{ data: Buffer; mime: string } | null> {
  const r = await db().execute({ sql: "SELECT poster, poster_mime FROM poster_requests WHERE id = ?", args: [id] });
  const row = r.rows[0];
  return row?.poster ? { data: Buffer.from(String(row.poster), "base64"), mime: String(row.poster_mime) } : null;
}

export async function getThumb(id: string): Promise<Buffer | null> {
  const r = await db().execute({ sql: "SELECT thumb FROM poster_requests WHERE id = ?", args: [id] });
  const t = r.rows[0]?.thumb;
  return t ? Buffer.from(String(t), "base64") : null;
}
