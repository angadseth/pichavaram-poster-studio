import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";

const OUTBOX = path.join(process.cwd(), ".outbox");
const ADMIN = "admin@e2e.test";
const RC = "rc1@e2e.test";
const OTHER = "rc2@e2e.test";

async function mails() {
  const files = (await readdir(OUTBOX).catch(() => [] as string[])).sort();
  return Promise.all(files.map(async (f) => JSON.parse(await readFile(path.join(OUTBOX, f), "utf8"))));
}

async function login(api: APIRequestContext, email: string) {
  const sent = await api.post("/api/auth/send-otp", { data: { email } });
  expect(sent.status(), await sent.text()).toBe(200);
  const otp = (await mails()).filter((m) => m.to === email && /code/.test(m.subject)).at(-1);
  const code = otp.subject.slice(0, 6);
  const ok = await api.post("/api/auth/verify", { data: { email, code } });
  expect(ok.status()).toBe(200);
}

const day = new Date(Date.now() + 10 * 86400e3).toISOString().slice(0, 10);
const input = {
  eventType: "game-night",
  title: "Pichavaram Game Night",
  tagline: "Level up with your house",
  date: day,
  startTime: "21:00",
  endTime: "23:00",
  mode: "online",
  meetLink: "https://meet.google.com/abc-defg-hij",
  highlights: ["Skribbl", "Quiz"],
  houseIds: ["kanha", "gir"],
  hostName: "Asha Verma",
  notes: "quiz, retro",
};

test.beforeAll(async () => {
  await rm(OUTBOX, { recursive: true, force: true });
  await rm(path.join(process.cwd(), "data", "e2e.db"), { force: true }).catch(() => {});
});

test("full RC journey: allowlist → OTP → preview → poster email → download; others can't see it", async ({ baseURL }) => {
  const admin = await request.newContext({ baseURL });
  const rc = await request.newContext({ baseURL });
  const other = await request.newContext({ baseURL });

  // strangers are turned away
  expect((await rc.post("/api/auth/send-otp", { data: { email: RC } })).status()).toBe(403);

  // admin adds two RCs
  await login(admin, ADMIN);
  const add = await admin.post("/api/admin/users", { data: { bulk: `${RC}, Asha, Chandigarh Region\n${OTHER}, Ravi, Delhi Region\nnot-an-email` } });
  expect(await add.json()).toMatchObject({ saved: 2, invalid: ["not-an-email"] });

  // RC signs in; wrong code is rejected
  await rc.post("/api/auth/send-otp", { data: { email: RC } });
  expect((await rc.post("/api/auth/send-otp", { data: { email: RC } })).status()).toBe(429);
  expect((await rc.post("/api/auth/verify", { data: { email: RC, code: "12345x" } })).status()).toBe(400);
  const code = (await mails()).filter((m) => m.to === RC).at(-1).subject.slice(0, 6);
  expect((await rc.post("/api/auth/verify", { data: { email: RC, code } })).status()).toBe(200);

  // validation errors come back per field
  const bad = await rc.post("/api/preview", { data: { input: { ...input, meetLink: "nope", date: "2020-01-01" } } });
  expect(bad.status()).toBe(400);
  expect(Object.keys((await bad.json()).errors).sort()).toEqual(["date", "meetLink"]);

  // preview, then shuffle to a different design
  const p1 = await (await rc.post("/api/preview", { data: { input } })).json();
  expect(p1.image).toMatch(/^data:image\/jpeg;base64,/);
  const p2 = await (await rc.post("/api/preview", { data: { input, avoid: [p1.choice.templateId] } })).json();
  expect(p2.choice.templateId).not.toBe(p1.choice.templateId);

  // send the previewed design, timed against the one-minute promise
  const t0 = Date.now();
  const made = await (await rc.post("/api/requests", { data: { input, choice: p2.choice } })).json();
  expect(made.status).toBe("pending"); // answers at once; render + email run after the response
  expect(Date.now() - t0).toBeLessThan(5_000);
  await expect
    .poll(async () => (await (await rc.get("/api/requests")).json())[0].status, { timeout: 60_000 })
    .toBe("sent");
  expect(Date.now() - t0).toBeLessThan(60_000);
  const mail = (await mails()).find((m) => m.to === RC && m.subject.includes("poster is ready"));
  expect(mail.attachments.map((a: { contentType: string }) => a.contentType)).toEqual(["image/jpeg", "image/png"]);
  expect(mail.html).not.toContain("Asha Verma"); // host stays in the records only

  // download full PNG + thumbnail
  const png = await rc.get(`/api/posters/${made.id}?download=1`);
  expect(png.headers()["content-type"]).toBe("image/png");
  expect((await png.body()).readUInt32BE(16)).toBe(1080);
  expect((await rc.get(`/api/posters/${made.id}?thumb=1`)).headers()["content-type"]).toBe("image/jpeg");

  // the design matches what was previewed
  const list = await (await rc.get("/api/requests")).json();
  expect(list[0]).toMatchObject({ id: made.id, templateId: p2.choice.templateId, hostName: "Asha Verma" });

  // another RC cannot open it; admin can
  await login(other, OTHER);
  expect((await other.get(`/api/posters/${made.id}`)).status()).toBe(404);
  expect((await admin.get(`/api/posters/${made.id}?thumb=1`)).status()).toBe(200);

  // removing an RC ends their session immediately
  await admin.delete(`/api/admin/users?email=${encodeURIComponent(OTHER)}`);
  expect((await other.get("/api/requests")).status()).toBe(401);

  // pages render for a signed-in RC
  for (const page of ["/", "/studio", "/requests", `/requests/${made.id}`]) {
    expect((await rc.get(page)).status(), page).toBe(200);
  }
  expect((await rc.get("/admin", { maxRedirects: 0 })).status()).toBe(307);
});
