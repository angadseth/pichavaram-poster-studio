import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

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

/** Houses whose real crest ships with the app: public/crests/<id>.webp and assets/houses/<id>.png. */
const CRESTS = new Set(["pichavaram", "bandipur", "corbett", "kanha", "kaziranga", "nallamala", "namdapha", "saranda", "sundarbans", "wayanad"]);

/** A small crest with the house initial, for houses without a real crest yet. */
export function placeholderCrest(name: string, color: string): string {
  const initial = name.trim().charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><circle cx="100" cy="100" r="96" fill="${color}"/><circle cx="100" cy="100" r="84" fill="none" stroke="#f0d9a6" stroke-width="3" stroke-dasharray="2 6"/><text x="100" y="128" text-anchor="middle" font-family="Georgia,serif" font-size="84" fill="#fff7e6">${initial}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** URL for showing a house's default crest in the UI. */
export function crestUrl(id: string, name: string, color: string): string {
  return CRESTS.has(id) ? `/crests/${id}.webp` : placeholderCrest(name, color);
}

/** The full-size default crest as a PNG file (for emailing to designers), if we have one. */
export function crestPng(id: string): Buffer | null {
  if (!CRESTS.has(id)) return null;
  const file = path.join(process.cwd(), "assets", "houses", `${id}.png`);
  return existsSync(file) ? readFileSync(file) : null;
}
