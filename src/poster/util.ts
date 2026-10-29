import type { PosterData, RenderCtx } from "./types";

/** Deterministic PRNG so a stored seed always re-renders the same poster. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length];
}

export function svgUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/**
 * Largest font size (between min and max) at which `text` fits in `maxLines`
 * lines of `width` px. `k` is the average glyph width as a fraction of the
 * font size (≈0.42 condensed, 0.55 sans, 0.62 serif, 0.8 wide/pixel).
 */
export function fitSize(
  text: string,
  o: { width: number; maxLines: number; max: number; min: number; k: number },
): number {
  const words = text.trim().split(/\s+/);
  for (let s = o.max; s > o.min; s -= 2) {
    if (linesNeeded(words, o.width, s * o.k) <= o.maxLines) return s;
  }
  return o.min;
}

function linesNeeded(words: string[], width: number, glyph: number): number {
  let lines = 1;
  let used = 0;
  for (const w of words) {
    const len = w.length * glyph;
    const add = used === 0 ? len : used + glyph + len;
    if (add <= width) used = add;
    else {
      lines += Math.max(1, Math.ceil(len / width));
      used = len % width || len;
    }
  }
  return lines;
}

export function truncate(text: string | undefined, max: number): string {
  if (!text) return "";
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WEEK_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function describeWhen(d: PosterData): RenderCtx["when"] {
  const [y, mo, da] = d.date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  const time = fmtTime(d.startTime);
  const range = d.endTime ? `${time} – ${fmtTime(d.endTime)} IST` : `${time} IST onwards`;
  return {
    weekday: WEEK[dt.getUTCDay()],
    weekdayLong: WEEK_LONG[dt.getUTCDay()],
    day: String(da).padStart(2, "0"),
    month: MONTHS[mo - 1],
    monthLong: MONTHS_LONG[mo - 1],
    year: String(y),
    time,
    timeRange: range,
  };
}

export function linkLabel(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Film-grain overlay; resvg renders feTurbulence natively. */
export function grainSvg(w: number, h: number, opacity = 0.18, freq = 0.85): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="${opacity}"/></svg>`;
}
