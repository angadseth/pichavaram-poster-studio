/* Renders every template × palette with sample data into gallery/ for design review.
 * Usage: npx tsx scripts/render-gallery.ts [templateId] */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TEMPLATES } from "../src/poster/registry";
import { renderPoster } from "../src/poster/render";
import { sample } from "../src/poster/samples";
import type { EventType } from "../src/poster/types";

async function main() {
  const only = process.argv[2];
  const out = path.join(process.cwd(), "gallery");
  await mkdir(out, { recursive: true });
  const houseCounts = [1, 3, 6];
  for (const t of TEMPLATES) {
    if (only && t.id !== only) continue;
    const types: EventType[] = t.eventTypes === "all" ? ["others"] : t.eventTypes;
    for (const [i, pal] of t.palettes.entries()) {
      const type = types[i % types.length];
      const data = sample(type, houseCounts[i % houseCounts.length]);
      if (!t.modes.includes(data.mode)) {
        data.mode = t.modes[0];
        if (data.mode === "offline") data.venue = "Elante Mall Food Court, Chandigarh";
        else data.meetLink = "https://meet.google.com/abc-defg-hij";
      }
      const { png, ms } = await renderPoster(data, { templateId: t.id, paletteId: pal.id, seed: 42 + i });
      const file = path.join(out, `${t.id}--${pal.id}.png`);
      await writeFile(file, png);
      console.log(`${t.id}/${pal.id} (${type}, ${data.houses.length} houses) ${ms}ms → ${file}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
