import { createClient } from "@libsql/client";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createSessionToken, OTP_TTL_MS, requestOtp, userFromToken, verifyOtp } from "@/lib/auth";
import { db, ensureSchema, setDbForTests } from "@/lib/db";
import { outboxDir } from "@/lib/mail";

const RC = "24f1000001@ds.study.iitm.ac.in";

async function lastCode(): Promise<string> {
  const files = (await readdir(outboxDir())).sort();
  const mail = JSON.parse(await readFile(path.join(outboxDir(), files.at(-1)!), "utf8"));
  return mail.subject.slice(0, 6);
}

beforeEach(async () => {
  delete process.env.SMTP_USER;
  await rm(outboxDir(), { recursive: true, force: true });
  setDbForTests(createClient({ url: "file::memory:" }));
  await ensureSchema();
  await db().execute({
    sql: "INSERT INTO people (email, name, region, role, active, created_at) VALUES (?, 'Asha', 'Chandigarh Region', 'rc', 1, 0)",
    args: [RC],
  });
});

describe("OTP login", () => {
  it("rejects emails that are not on the allowlist", async () => {
    expect(await requestOtp("random@gmail.com")).toEqual({ ok: false, error: "not_allowed" });
  });

  it("logs in with the emailed code, case-insensitively, and the code cannot be reused", async () => {
    expect(await requestOtp(`  ${RC.toUpperCase()} `)).toEqual({ ok: true });
    const code = await lastCode();
    const res = await verifyOtp(RC, code);
    expect(res.ok && res.user.email).toBe(RC);
    expect(await verifyOtp(RC, code)).toEqual({ ok: false, error: "invalid" });
  });

  it("rate-limits resends to one per minute", async () => {
    const t = Date.now();
    await requestOtp(RC, t);
    expect(await requestOtp(RC, t + 10_000)).toMatchObject({ ok: false, error: "rate_limited", retryAfter: 50 });
    expect(await requestOtp(RC, t + 61_000)).toEqual({ ok: true });
  });

  it("locks the code after 5 wrong attempts, even if the right code comes next", async () => {
    await requestOtp(RC);
    const code = await lastCode();
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 4; i++) expect(await verifyOtp(RC, wrong)).toEqual({ ok: false, error: "invalid" });
    expect(await verifyOtp(RC, wrong)).toEqual({ ok: false, error: "too_many" });
    expect(await verifyOtp(RC, code)).toEqual({ ok: false, error: "too_many" });
  });

  it("expires codes after 10 minutes", async () => {
    const t = Date.now();
    await requestOtp(RC, t);
    const code = await lastCode();
    expect(await verifyOtp(RC, code, t + OTP_TTL_MS + 1)).toEqual({ ok: false, error: "expired" });
  });
});

describe("session", () => {
  it("round-trips and dies when the RC is deactivated", async () => {
    const token = await createSessionToken({ email: RC, name: "Asha", region: "", role: "rc" });
    expect((await userFromToken(token))?.email).toBe(RC);
    await db().execute({ sql: "UPDATE people SET active = 0 WHERE email = ?", args: [RC] });
    expect(await userFromToken(token)).toBeNull();
    expect(await userFromToken("garbage")).toBeNull();
  });
});
