import { readFile } from "node:fs/promises";
import path from "node:path";

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type FontDef = { name: string; file: string; weight: Weight; style: "normal" | "italic" };

const FONT_DEFS: FontDef[] = [
  { name: "Playfair", file: "playfair-display-700-normal.woff", weight: 700, style: "normal" },
  { name: "Playfair", file: "playfair-display-900-normal.woff", weight: 900, style: "normal" },
  { name: "Playfair", file: "playfair-display-700-italic.woff", weight: 700, style: "italic" },
  { name: "Cormorant", file: "cormorant-garamond-500-normal.woff", weight: 500, style: "normal" },
  { name: "Cormorant", file: "cormorant-garamond-700-normal.woff", weight: 700, style: "normal" },
  { name: "Cormorant", file: "cormorant-garamond-600-italic.woff", weight: 600, style: "italic" },
  { name: "Bebas", file: "bebas-neue-400-normal.woff", weight: 400, style: "normal" },
  { name: "Anton", file: "anton-400-normal.woff", weight: 400, style: "normal" },
  { name: "Unbounded", file: "unbounded-500-normal.woff", weight: 500, style: "normal" },
  { name: "Unbounded", file: "unbounded-800-normal.woff", weight: 800, style: "normal" },
  { name: "Syne", file: "syne-600-normal.woff", weight: 600, style: "normal" },
  { name: "Syne", file: "syne-800-normal.woff", weight: 800, style: "normal" },
  { name: "Manrope", file: "manrope-400-normal.woff", weight: 400, style: "normal" },
  { name: "Manrope", file: "manrope-600-normal.woff", weight: 600, style: "normal" },
  { name: "Manrope", file: "manrope-800-normal.woff", weight: 800, style: "normal" },
  { name: "Grotesk", file: "space-grotesk-500-normal.woff", weight: 500, style: "normal" },
  { name: "Grotesk", file: "space-grotesk-700-normal.woff", weight: 700, style: "normal" },
  { name: "DMSerif", file: "dm-serif-display-400-normal.woff", weight: 400, style: "normal" },
  { name: "DMSerif", file: "dm-serif-display-400-italic.woff", weight: 400, style: "italic" },
  { name: "Monoton", file: "monoton-400-normal.woff", weight: 400, style: "normal" },
  { name: "Pixel", file: "press-start-2p-400-normal.woff", weight: 400, style: "normal" },
  { name: "Caveat", file: "caveat-700-normal.woff", weight: 700, style: "normal" },
  { name: "Mono", file: "jetbrains-mono-500-normal.woff", weight: 500, style: "normal" },
];

export type LoadedFont = FontDef & { data: Buffer };

let cache: Promise<LoadedFont[]> | null = null;

export function fontDir() {
  return path.join(process.cwd(), "assets", "fonts");
}

export function loadFonts(): Promise<LoadedFont[]> {
  if (!cache) {
    cache = Promise.all(
      FONT_DEFS.map(async (f) => ({ ...f, data: await readFile(path.join(fontDir(), f.file)) })),
    ).catch((err) => {
      cache = null;
      throw err;
    });
  }
  return cache;
}
