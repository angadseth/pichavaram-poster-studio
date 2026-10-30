import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DEFAULT_HOUSES } from "@/poster/house-logos";

let client: Client | null = null;
let schemaReady: Promise<void> | null = null;

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
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
    client = createClient({ url: databaseUrl(), authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return client;
}

/** Test hook: point the module at a fresh client (e.g. file::memory:). */
export function setDbForTests(c: Client) {
  client = c;
  schemaReady = null;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    region TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'rc' CHECK (role IN ('rc','admin')),
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
  `CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    input_json TEXT NOT NULL,
    host_name TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    template_id TEXT NOT NULL,
    palette_id TEXT NOT NULL,
    seed INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','sent','failed')),
    error TEXT,
    render_ms INTEGER,
    thumb TEXT,
    created_at INTEGER NOT NULL,
    sent_at INTEGER
  )`,
  `CREATE INDEX IF NOT EXISTS requests_email ON requests (email, created_at DESC)`,
];

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const c = db();
      await c.batch(SCHEMA, "write");
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
            sql: `INSERT INTO users (email, name, region, role, active, created_at) VALUES (?, '', '', 'admin', 1, ?)
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
