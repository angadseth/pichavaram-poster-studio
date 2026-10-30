import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_HOUSES } from "./houses";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.TURSO_DATABASE_URL;
  if (url) {
    // local SQLite files need their folder to exist
    if (url.startsWith("file:") && !url.includes(":memory:")) mkdirSync(path.dirname(path.resolve(url.slice(5))), { recursive: true });
    return url;
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL is not set (create a free Turso database).");
  const dir = path.join(process.cwd(), "data");
  mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "local.db").replace(/\\/g, "/")}`;
}

export function db(): Client {
  if (!client) {
    client = createClient({ url: databaseUrl(), authToken: process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN });
  }
  return client;
}

/** Test hook: point the module at a fresh client (e.g. file::memory:). */
export function setDbForTests(c: Client) {
  client = c;
  schemaReady = null;
}

// v2: people can be RCs, designers or admins; requests are designed by a person, not generated.
// (The v1 tables `users` and `requests` are left in place; `people` is seeded from `users` once.)
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS people (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'rc' CHECK (role IN ('rc','designer','admin')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS otps (
    email TEXT PRIMARY KEY,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    sent_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS houses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    logo TEXT,
    sort INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS poster_requests (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    input_json TEXT NOT NULL,
    host_name TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','assigned','delivered')),
    assignee TEXT,
    assigned_at INTEGER,
    poster TEXT,
    poster_mime TEXT,
    thumb TEXT,
    delivered_at INTEGER,
    mail_error TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS poster_requests_email ON poster_requests (email, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS poster_requests_assignee ON poster_requests (assignee, status)`,
];

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const c = db();
      await c.batch(SCHEMA, "write");
      const legacy = await c.execute("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'");
      if (legacy.rows.length) {
        await c.execute(
          "INSERT OR IGNORE INTO people (email, name, region, role, active, created_at) SELECT email, name, region, role, active, created_at FROM users",
        );
      }
      const now = Date.now();
      await c.batch(
        DEFAULT_HOUSES.map((h, i) => ({
          sql: "INSERT OR IGNORE INTO houses (id, name, color, logo, sort) VALUES (?, ?, ?, NULL, ?)",
          args: [h.id, h.name, h.color, i],
        })),
        "write",
      );
      const admins = (process.env.ADMIN_EMAILS ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
      if (admins.length) {
        await c.batch(
          admins.map((email) => ({
            sql: `INSERT INTO people (email, name, region, role, active, created_at) VALUES (?, '', '', 'admin', 1, ?)
                  ON CONFLICT(email) DO UPDATE SET role = 'admin', active = 1`,
            args: [email, now],
          })),
          "write",
        );
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
