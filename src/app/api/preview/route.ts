import { fail, guard, json, readChoice, readJson } from "@/lib/api";
import { previewPoster } from "@/lib/pipeline";
import { parseRequest } from "@/lib/validation";

export const maxDuration = 60;

/** Body: { input, choice?: {templateId, paletteId, seed}, avoid?: string[] } → { choice, image, ms } */
export async function POST(req: Request) {
  const user = await guard();
  if (user instanceof Response) return user;
  const body = await readJson(req);
  const parsed = parseRequest(body?.input);
  if (!parsed.ok) return fail(400, "Some details need fixing.", { errors: parsed.errors });
  const avoid = Array.isArray(body?.avoid) ? body.avoid.filter((x): x is string => typeof x === "string").slice(0, 20) : [];
  try {
    return json(await previewPoster(user, parsed.data, { ...readChoice(body?.choice), avoid }));
  } catch (err) {
    console.error("[preview]", err);
    return fail(500, "Couldn't render the preview. Try shuffling the design.");
  }
}
