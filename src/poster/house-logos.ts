import { Resvg } from "@resvg/resvg-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fontDir } from "./fonts";

/** The 12 houses of the IIT Madras BS degree (named after Indian forests). */
export const DEFAULT_HOUSES = [
  { id: "pichavaram", name: "Pichavaram House", color: "#0E5C4A" },
  { id: "bandipur", name: "Bandipur House", color: "#8C3B1F" },
  { id: "corbett", name: "Corbett House", color: "#B7791F" },
  { id: "gir", name: "Gir House", color: "#A0522D" },
  { id: "kanha", name: "Kanha House", color: "#2F6B3A" },
  { id: "kaziranga", name: "Kaziranga House", color: "#3B5B8C" },
  { id: "nallamala", name: "Nallamala House", color: "#6B3FA0" },
  { id: "namdapha", name: "Namdapha House", color: "#1F7A7A" },
  { id: "nilgiri", name: "Nilgiri House", color: "#2A4F9E" },
  { id: "saranda", name: "Saranda House", color: "#7A2E4F" },
  { id: "sundarbans", name: "Sundarbans House", color: "#1E6B52" },
  { id: "wayanad", name: "Wayanad House", color: "#9E6B1F" },
] as const;

/**
 * Placeholder emblem used until the admin uploads the real logo:
 * a crest with the house initial and a leaf motif, rasterised to PNG
 * (resvg does not pass fonts into SVGs embedded as images).
 */
const cache = new Map<string, string>();

export function placeholderLogo(name: string, color: string): string {
  const key = `${name}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const initial = name.trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#0B0B0E"/></linearGradient></defs>
    <circle cx="100" cy="100" r="96" fill="url(#g)"/>
    <circle cx="100" cy="100" r="84" fill="none" stroke="#E9CF95" stroke-width="3" stroke-dasharray="2 6"/>
    <path d="M100 30 C120 50 124 70 100 92 C76 70 80 50 100 30Z" fill="#E9CF95" fill-opacity="0.9"/>
    <text x="100" y="152" text-anchor="middle" font-family="Playfair Display" font-size="64" font-weight="700" fill="#FFF7E6">${initial}</text>
  </svg>`;
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: 200 },
    font: {
      loadSystemFonts: false,
      fontFiles: [path.join(fontDir(), "playfair-display-700-normal.ttf")],
      defaultFontFamily: "Playfair Display",
    },
  })
    .render()
    .asPng();
  const uri = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
  cache.set(key, uri);
  return uri;
}

/** The house's real crest from assets/houses/<id>.png when we have one, else the placeholder crest. */
export function houseLogo(id: string, name: string, color: string): string {
  const key = `crest|${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const file = path.join(process.cwd(), "assets", "houses", `${id}.png`);
  if (!existsSync(file)) return placeholderLogo(name, color);
  const uri = `data:image/png;base64,${readFileSync(file).toString("base64")}`;
  cache.set(key, uri);
  return uri;
}
