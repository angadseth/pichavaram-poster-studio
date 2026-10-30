import { TEMPLATES } from "./registry";
import type { PosterData, Template } from "./types";
import { mulberry32 } from "./util";

export function eligibleTemplates(data: Pick<PosterData, "eventType" | "mode">): Template[] {
  return TEMPLATES.filter(
    (t) => (t.eventTypes === "all" || t.eventTypes.includes(data.eventType)) && t.modes.includes(data.mode),
  );
}

export function isEligible(templateId: string, data: Pick<PosterData, "eventType" | "mode">): boolean {
  return eligibleTemplates(data).some((t) => t.id === templateId);
}

/** How well a template fits the request: type match + mood words in the text. */
export function scoreTemplate(t: Template, data: PosterData, notes = ""): number {
  let score = t.eventTypes === "all" ? 1 : 3;
  const text = [data.title, data.tagline, data.description, notes, ...data.highlights]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let hits = 0;
  for (const m of t.moods) if (text.includes(m)) hits++;
  return score + Math.min(hits, 2) * 2;
}

/**
 * Pick a template + palette. Templates the requester used recently (`avoid`)
 * are skipped while alternatives exist, so consecutive posters look different.
 * Same inputs + seed → same choice.
 */
export function selectTemplate(
  data: PosterData,
  opts: { seed: number; avoid?: string[]; notes?: string },
): { templateId: string; paletteId: string } {
  const rng = mulberry32(opts.seed);
  let pool = eligibleTemplates(data);
  if (pool.length === 0) pool = TEMPLATES.filter((t) => t.modes.includes(data.mode));
  const fresh = pool.filter((t) => !opts.avoid?.includes(t.id));
  if (fresh.length > 0) pool = fresh;

  const weights = pool.map((t) => scoreTemplate(t, data, opts.notes) ** 2);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  let chosen = pool[pool.length - 1];
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) {
      chosen = pool[i];
      break;
    }
  }
  const palette = chosen.palettes[Math.floor(rng() * chosen.palettes.length)];
  return { templateId: chosen.id, paletteId: palette.id };
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
