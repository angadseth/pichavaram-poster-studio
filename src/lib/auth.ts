import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { db, ensureSchema } from "./db";
import { otpMail, sendMail } from "./mail";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const SESSION_COOKIE = "pps_session";
export const SESSION_TTL_S = 7 * 24 * 60 * 60;

export type User = { email: string; name: string; region: string; role: Role };
export type Role = "rc" | "designer" | "admin";

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("AUTH_SECRET must be set (32+ chars).");
  }
  return "dev-only-secret-change-me-dev-only-secret";
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashCode(email: string, code: string): string {
  return createHmac("sha256", secret()).update(`${email}:${code}`).digest("hex");
}

export async function getUser(email: string): Promise<User | null> {
  await ensureSchema();
  const r = await db().execute({
    sql: "SELECT email, name, region, role FROM people WHERE email = ? AND active = 1",
    args: [normalizeEmail(email)],
  });
  const row = r.rows[0];
  return row
    ? { email: String(row.email), name: String(row.name), region: String(row.region), role: row.role as User["role"] }
    : null;
}

export type OtpRequestResult =
  | { ok: true }
  | { ok: false; error: "not_allowed" }
  | { ok: false; error: "rate_limited"; retryAfter: number };

export async function requestOtp(rawEmail: string, now = Date.now()): Promise<OtpRequestResult> {
  const email = normalizeEmail(rawEmail);
  const user = await getUser(email);
  if (!user) return { ok: false, error: "not_allowed" };

  const prev = await db().execute({ sql: "SELECT sent_at FROM otps WHERE email = ?", args: [email] });
  const sentAt = prev.rows[0] ? Number(prev.rows[0].sent_at) : 0;
  if (now - sentAt < OTP_RESEND_MS) {
    return { ok: false, error: "rate_limited", retryAfter: Math.ceil((OTP_RESEND_MS - (now - sentAt)) / 1000) };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db().execute({
    sql: `INSERT INTO otps (email, code_hash, expires_at, attempts, sent_at) VALUES (?, ?, ?, 0, ?)
          ON CONFLICT(email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at,
          attempts = 0, sent_at = excluded.sent_at`,
    args: [email, hashCode(email, code), now + OTP_TTL_MS, now],
  });
  try {
    await sendMail(otpMail(email, code));
  } catch (err) {
    // Let the user retry immediately if the mail never left.
    await db().execute({ sql: "DELETE FROM otps WHERE email = ?", args: [email] });
    throw err;
  }
  return { ok: true };
}

export type OtpVerifyResult = { ok: true; user: User } | { ok: false; error: "invalid" | "expired" | "too_many" };

export async function verifyOtp(rawEmail: string, rawCode: string, now = Date.now()): Promise<OtpVerifyResult> {
  const email = normalizeEmail(rawEmail);
  const code = rawCode.replace(/\D/g, "");
  await ensureSchema();
  const r = await db().execute({ sql: "SELECT code_hash, expires_at, attempts FROM otps WHERE email = ?", args: [email] });
  const row = r.rows[0];
  if (!row) return { ok: false, error: "invalid" };
  if (now > Number(row.expires_at)) {
    await db().execute({ sql: "DELETE FROM otps WHERE email = ?", args: [email] });
    return { ok: false, error: "expired" };
  }
  if (Number(row.attempts) >= OTP_MAX_ATTEMPTS) return { ok: false, error: "too_many" };

  const expected = Buffer.from(String(row.code_hash), "hex");
  const given = Buffer.from(hashCode(email, code), "hex");
  if (code.length !== 6 || !timingSafeEqual(expected, given)) {
    const attempts = Number(row.attempts) + 1;
    await db().execute({ sql: "UPDATE otps SET attempts = ? WHERE email = ?", args: [attempts, email] });
    return { ok: false, error: attempts >= OTP_MAX_ATTEMPTS ? "too_many" : "invalid" };
  }

  await db().execute({ sql: "DELETE FROM otps WHERE email = ?", args: [email] });
  const user = await getUser(email);
  return user ? { ok: true, user } : { ok: false, error: "invalid" };
}

const key = () => new TextEncoder().encode(secret());

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_S}s`)
    .sign(key());
}

/** Verifies the token and re-checks the allowlist, so removed RCs lose access at once. */
export async function userFromToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.sub ? await getUser(payload.sub) : null;
  } catch {
    return null;
  }
}
