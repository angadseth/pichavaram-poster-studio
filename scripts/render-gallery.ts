/* Renders every template × palette with sample data into gallery/ for design review.
 * Usage: npx tsx scripts/render-gallery.ts [templateId] [--stress]
 * --stress: worst case per template — 60-char title, 10 houses, 4 highlights, both modes. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TEMPLATES } from "../src/poster/registry";
import { renderPoster } from "../src/poster/render";
import { sample, sampleHouses } from "../src/poster/samples";
import type { EventType, Mode, PosterData, Template } from "../src/poster/types";

function fixMode(data: PosterData, t: Template, mode?: Mode) {
  data.mode = mode ?? (t.modes.includes(data.mode) ? data.mode : t.modes[0]);
  if (data.mode === "offline") data.venue ??= "Elante Mall Food Court, Industrial Area, Chandigarh";
  else data.meetLink ??= "https://meet.google.com/abc-defg-hij";
}

async function main() {
  const args = process.argv.slice(2);
  const stress = args.includes("--stress");
  const only = args.find((a) => !a.startsWith("--"));
  const out = path.join(process.cwd(), "gallery");
  await mkdir(out, { recursive: true });
  const houseCounts = [1, 3, 6];
  for (const t of TEMPLATES) {
    if (only && t.id !== only) continue;
    const types: EventType[] = t.eventTypes === "all" ? ["others"] : t.eventTypes;
    const jobs: { name: string; data: PosterData; paletteId: string }[] = [];
    if (stress) {
      for (const mode of t.modes) {
        const data = sample(types[0], 1);
        data.title = "The Grand Pichavaram Winter Carnival And Talent Showcase";
        data.tagline = "A once-in-a-semester celebration across every region";
        data.highlights = ["Open Mic Finals", "Quiz Showdown", "Surprise Guests", "Goodies"];
        data.houses = sampleHouses(10);
        fixMode(data, t, mode);
        jobs.push({ name: `${t.id}--stress-${mode}`, data, paletteId: t.palettes[0].id });
      }
    } else {
      t.palettes.forEach((pal, i) => {
        const data = sample(types[i % types.length], houseCounts[i % houseCounts.length]);
        fixMode(data, t);
        jobs.push({ name: `${t.id}--${pal.id}`, data, paletteId: pal.id });
      });
    }
    for (const [i, job] of jobs.entries()) {
      const { png, ms } = await renderPoster(job.data, { templateId: t.id, paletteId: job.paletteId, seed: 42 + i });
      const file = path.join(out, `${job.name}.png`);
      await writeFile(file, png);
      console.log(`${job.name} (${job.data.eventType}, ${job.data.mode}, ${job.data.houses.length} houses) ${ms}ms → ${file}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
