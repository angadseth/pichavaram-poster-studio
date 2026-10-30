/* Renders one sample per template into public/showcase/<id>.jpg for the landing page.
 * Usage: npx tsx scripts/build-showcase.ts */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { TEMPLATES } from "../src/poster/registry";
import { renderPoster } from "../src/poster/render";
import { sample } from "../src/poster/samples";

async function main() {
  const out = path.join(process.cwd(), "public", "showcase");
  await mkdir(out, { recursive: true });
  for (const [i, t] of TEMPLATES.entries()) {
    const data = sample(t.eventTypes === "all" ? "others" : t.eventTypes[0], [1, 3, 4][i % 3]);
    data.mode = t.modes.includes(data.mode) ? data.mode : t.modes[0];
    if (data.mode === "offline") data.venue ??= "Sukhna Lake, Sector 1, Chandigarh";
    else data.meetLink ??= "https://meet.google.com/abc-defg-hij";
    const palette = t.palettes[i % t.palettes.length];
    const { png, ms } = await renderPoster(data, { templateId: t.id, paletteId: palette.id, seed: 7 + i }, { width: 600, format: "jpeg" });
    await writeFile(path.join(out, `${t.id}.jpg`), png);
    console.log(`${t.id}/${palette.id} ${ms}ms ${(png.length / 1024).toFixed(0)}KB`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
