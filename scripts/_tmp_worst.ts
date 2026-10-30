import { writeFile } from "node:fs/promises";
import { renderPoster } from "../src/poster/render";
import { sample, sampleHouses } from "../src/poster/samples";
import { TEMPLATES } from "../src/poster/registry";
async function main() {
  for (const id of process.argv.slice(2)) {
    const t = TEMPLATES.find((x) => x.id === id)!;
    for (const mode of t.modes) {
      const d = sample(t.eventTypes === "all" ? "others" : t.eventTypes[0]);
      d.title = "The Grand Pichavaram Winter Carnival And Talent Showcase 2026";
      d.tagline = "A once-in-a-semester celebration across every single region of India";
      d.highlights = ["Open Mic Finals Round", "Quiz Showdown Live", "Surprise Guests Galore", "Goodies And Prizes"];
      d.houses = sampleHouses(10);
      d.mode = mode;
      d.venue = "Elante Mall Food Court, Purv Marg, Industrial Area Phase I, Chandigarh 160002";
      d.meetLink = "https://meet.google.com/abc-defg-hij";
      const { png, ms } = await renderPoster(d, { templateId: id, paletteId: t.palettes[1].id, seed: 9 });
      const out = `C:/Users/24f20/AppData/Local/Temp/claude/C--Users-24f20-Desktop-power-tools/ce84bd6d-8db9-4897-aefa-d2a44e78fefa/scratchpad/${id}--worst-${mode}.png`;
      await writeFile(out, png);
      console.log(id, mode, ms);
    }
  }
}
main();
