import { fail, json, readJson } from "@/lib/api";
import { requestOtp } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await readJson(req);
  const email = typeof body?.email === "string" ? body.email : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return fail(400, "Enter a valid email address.");
  try {
    const r = await requestOtp(email);
    if (r.ok) return json({ ok: true });
    if (r.error === "not_allowed") {
      return fail(403, "This email isn't on the RC list. Ask the Web Admin to add you.");
    }
    return fail(429, `Please wait ${r.retryAfter}s before requesting another code.`, { retryAfter: r.retryAfter });
  } catch (err) {
    console.error("[send-otp]", err);
    return fail(502, "Couldn't send the email right now. Please try again in a minute.");
  }
}
