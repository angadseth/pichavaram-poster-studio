import { expect, request, test, type APIRequestContext } from "@playwright/test";
import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const OUTBOX = path.join(process.cwd(), ".outbox");
const ADMIN = "admin@e2e.test";
const RC = "rc1@e2e.test";
const OTHER = "rc2@e2e.test";
const DESIGNER = "designer@e2e.test";

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

test("RC requests → admin assigns → designer uploads → RC gets the poster; others can't see it", async ({ baseURL }) => {
  const admin = await request.newContext({ baseURL });
  const rc = await request.newContext({ baseURL });
  const other = await request.newContext({ baseURL });
  const designer = await request.newContext({ baseURL });

  // strangers are turned away
  expect((await rc.post("/api/auth/send-otp", { data: { email: RC } })).status()).toBe(403);

  // admin adds two RCs and a designer
  await login(admin, ADMIN);
  const add = await admin.post("/api/admin/users", {
    data: { bulk: `${RC}, Asha, Chandigarh Region
${OTHER}, Ravi, Delhi Region
${DESIGNER}, Dev, , designer
not-an-email` },
  });
  expect(await add.json()).toMatchObject({ saved: 3, invalid: ["not-an-email"] });

  // RC signs in; wrong code is rejected
  await rc.post("/api/auth/send-otp", { data: { email: RC } });
  expect((await rc.post("/api/auth/send-otp", { data: { email: RC } })).status()).toBe(429);
  expect((await rc.post("/api/auth/verify", { data: { email: RC, code: "12345x" } })).status()).toBe(400);
  const code = (await mails()).filter((m) => m.to === RC).at(-1).subject.slice(0, 6);
  expect((await rc.post("/api/auth/verify", { data: { email: RC, code } })).status()).toBe(200);

  // validation errors come back per field
  const bad = await rc.post("/api/requests", { data: { input: { ...input, meetLink: "nope", date: "2020-01-01" } } });
  expect(bad.status()).toBe(400);
  expect(Object.keys((await bad.json()).errors).sort()).toEqual(["date", "meetLink"]);

  // the request is saved at once and the admin is emailed
  const t0 = Date.now();
  const res = await rc.post("/api/requests", { data: { input } });
  expect(res.status()).toBe(201);
  const made = await res.json();
  expect(made.status).toBe("new");
  expect(Date.now() - t0).toBeLessThan(5_000);
  await expect.poll(async () => (await mails()).some((m) => m.to === ADMIN && m.subject.includes("New poster request")), { timeout: 15_000 }).toBe(true);

  // RCs can't assign or upload
  expect((await rc.post(`/api/requests/${made.id}/assign`, { data: { assignee: DESIGNER } })).status()).toBe(403);
  // an RC can't be picked as the designer
  expect((await admin.post(`/api/requests/${made.id}/assign`, { data: { assignee: OTHER } })).status()).toBe(400);

  // admin assigns the designer, who gets the brief with the crests (Gir has no crest file yet)
  const assigned = await admin.post(`/api/requests/${made.id}/assign`, { data: { assignee: DESIGNER } });
  expect(await assigned.json()).toMatchObject({ ok: true, mailed: true });
  const brief = (await mails()).find((m) => m.to === DESIGNER && m.subject.startsWith("Poster to design"));
  expect(brief.html).toContain("meet.google.com/abc-defg-hij");
  expect(brief.html).not.toContain("Asha Verma"); // the host stays in the records only
  expect(brief.attachments.map((a: { filename: string }) => a.filename).sort()).toEqual(["kanha-crest.png", "pichavaram-crest.png"]);

  // designer signs in, sees it in their queue, opens it
  await login(designer, DESIGNER);
  expect((await designer.get("/work")).status()).toBe(200);
  expect((await designer.get(`/requests/${made.id}`)).status()).toBe(200);

  // non-images are refused; the real poster goes through and is emailed to the RC
  const junk = await designer.post(`/api/requests/${made.id}/poster`, {
    multipart: { poster: { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") } },
  });
  expect(junk.status()).toBe(400);
  const png = await sharp({ create: { width: 1080, height: 1350, channels: 3, background: "#1a1816" } }).png().toBuffer();
  const up = await designer.post(`/api/requests/${made.id}/poster`, {
    multipart: { poster: { name: "game-night.png", mimeType: "image/png", buffer: png } },
  });
  expect(await up.json()).toMatchObject({ ok: true, mailed: true });
  const delivered = (await mails()).find((m) => m.to === RC && m.subject.includes("poster is ready"));
  expect(delivered.attachments.map((a: { contentType: string }) => a.contentType)).toEqual(["image/jpeg", "image/png"]);

  // RC sees it delivered and can download it
  const list = await (await rc.get("/api/requests")).json();
  expect(list[0]).toMatchObject({ id: made.id, status: "delivered", assignee: DESIGNER, hostName: "Asha Verma" });
  const file = await rc.get(`/api/posters/${made.id}?download=1`);
  expect(file.headers()["content-type"]).toBe("image/png");
  expect((await file.body()).readUInt32BE(16)).toBe(1080);
  expect((await rc.get(`/api/posters/${made.id}?thumb=1`)).headers()["content-type"]).toBe("image/jpeg");

  // another RC cannot open it; admin can
  await login(other, OTHER);
  expect((await other.get(`/api/posters/${made.id}`)).status()).toBe(404);
  expect((await other.get(`/requests/${made.id}`)).status()).toBe(404);
  expect((await admin.get(`/api/posters/${made.id}?thumb=1`)).status()).toBe(200);

  // removing someone ends their session immediately
  await admin.delete(`/api/admin/users?email=${encodeURIComponent(OTHER)}`);
  expect((await other.get("/api/requests")).status()).toBe(401);

  // pages render for each role
  for (const page of ["/", "/studio", "/requests", `/requests/${made.id}`]) {
    expect((await rc.get(page)).status(), page).toBe(200);
  }
  expect((await rc.get("/admin", { maxRedirects: 0 })).status()).toBe(307);
  expect((await rc.get("/work", { maxRedirects: 0 })).status()).toBe(307);
  expect((await admin.get("/admin")).status()).toBe(200);
});
