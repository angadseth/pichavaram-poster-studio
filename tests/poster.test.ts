import { describe, expect, it } from "vitest";
import { allowedModes } from "@/lib/validation";
import { TEMPLATES } from "@/poster/registry";
import { renderPoster } from "@/poster/render";
import { sample, sampleHouses } from "@/poster/samples";
import { eligibleTemplates, selectTemplate } from "@/poster/select";
import { EVENT_TYPES } from "@/poster/types";

function pngSize(buf: Buffer) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

describe("template selection", () => {
  it("has at least one template for every event type and allowed mode", () => {
    for (const type of EVENT_TYPES) {
      for (const mode of allowedModes(type)) expect(eligibleTemplates({ eventType: type, mode }).length).toBeGreaterThan(0);
    }
  });

  it("never picks a template outside the event type, and is deterministic per seed", () => {
    for (const type of EVENT_TYPES) {
      const data = sample(type);
      data.mode = allowedModes(type)[0];
      const ok = eligibleTemplates(data).map((t) => t.id);
      for (let seed = 0; seed < 40; seed++) {
        const c = selectTemplate(data, { seed });
        expect(ok).toContain(c.templateId);
        expect(selectTemplate(data, { seed })).toEqual(c);
      }
    }
  });

  it("avoids recently used templates when alternatives exist", () => {
    const data = sample("game-night");
    const pool = eligibleTemplates(data);
    if (pool.length < 2) return;
    const avoid = pool.slice(0, -1).map((t) => t.id);
    expect(selectTemplate(data, { seed: 7, avoid }).templateId).toBe(pool.at(-1)!.id);
  });
});

describe("rendering", () => {
  for (const t of TEMPLATES) {
    it(`${t.id}: every palette renders 1080×1350, and the worst case does not throw`, async () => {
      const type = t.eventTypes === "all" ? "others" : t.eventTypes[0];
      for (const p of t.palettes) {
        const data = sample(type, 3);
        data.mode = t.modes[0];
        data.venue = "Sukhna Lake, Chandigarh";
        data.meetLink = "https://meet.google.com/abc-defg-hij";
        const { png } = await renderPoster(data, { templateId: t.id, paletteId: p.id, seed: 1 });
        expect(pngSize(png)).toEqual({ w: 1080, h: 1350 });
      }
      const worst = sample(type);
      worst.title = "W".repeat(60);
      worst.tagline = "A".repeat(70);
      worst.highlights = ["H".repeat(24), "I".repeat(24), "J".repeat(24), "K".repeat(24)];
      worst.houses = sampleHouses(12);
      worst.mode = t.modes.at(-1)!;
      worst.venue = "V".repeat(80);
      worst.meetLink = "https://meet.google.com/abc-defg-hij";
      const { png } = await renderPoster(worst, { templateId: t.id, paletteId: t.palettes[0].id, seed: 2 });
      expect(pngSize(png).w).toBe(1080);
    });
  }
});
