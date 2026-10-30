import type { Choice } from "@/poster/types";
import type { User } from "./auth";
import { currentUser } from "./session";

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return Response.json({ error, ...extra }, { status });
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** Returns the signed-in user, or a 401/403 Response to return directly. */
export async function guard(role?: "admin"): Promise<User | Response> {
  const user = await currentUser();
  if (!user) return fail(401, "Please sign in again.");
  if (role === "admin" && user.role !== "admin") return fail(403, "Admins only.");
  return user;
}

export function appUrl(req: Request): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
}

export function readChoice(raw: unknown): Partial<Choice> {
  if (!raw || typeof raw !== "object") return {};
  const c = raw as Record<string, unknown>;
  return {
    templateId: typeof c.templateId === "string" ? c.templateId : undefined,
    paletteId: typeof c.paletteId === "string" ? c.paletteId : undefined,
    seed: typeof c.seed === "number" && Number.isInteger(c.seed) && c.seed >= 0 && c.seed < 2 ** 31 ? c.seed : undefined,
  };
}
