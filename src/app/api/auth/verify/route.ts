import { fail, json, readJson } from "@/lib/api";
import { verifyOtp } from "@/lib/auth";
import { startSession } from "@/lib/session";

const MESSAGES = {
  invalid: "That code doesn't match. Check the latest email.",
  expired: "That code has expired. Request a new one.",
  too_many: "Too many wrong attempts. Request a new code.",
} as const;

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = typeof body?.email === "string" ? body.email : "";
  const code = typeof body?.code === "string" ? body.code : "";
  if (!email || !code) return fail(400, "Enter the 6-digit code.");
  const r = await verifyOtp(email, code);
  if (!r.ok) return fail(r.error === "too_many" ? 429 : 400, MESSAGES[r.error], { code: r.error });
  await startSession(r.user);
  return json({ ok: true, role: r.user.role });
}
