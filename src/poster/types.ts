import type { ReactElement } from "react";

export const EVENT_TYPES = [
  "music-night",
  "game-night",
  "movie-night",
  "fun-night",
  "meetup",
  "others",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LABELS: Record<EventType, string> = {
  "music-night": "Music Night",
  "game-night": "Game Night",
  "movie-night": "Movie Night",
  "fun-night": "Fun Night",
  meetup: "Meetup",
  others: "Others",
};

export type Mode = "online" | "offline";

export type PosterHouse = { name: string; logo: string };

export type PosterData = {
  eventType: EventType;
  title: string;
  tagline?: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24h, IST)
  endTime?: string;
  mode: Mode;
  meetLink?: string;
  venue?: string;
  highlights: string[];
  houses: PosterHouse[]; // houses[0] is always Pichavaram
  region?: string;
};

export type Palette = {
  id: string;
  name: string;
  bg: string;
  bg2: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
};

/** Everything a template needs, pre-computed once per render. */
export type RenderCtx = {
  data: PosterData;
  p: Palette;
  rng: () => number;
  qr?: string; // data URI of a QR code for the Meet link
  when: {
    weekday: string; // SAT
    weekdayLong: string; // Saturday
    day: string; // 08
    month: string; // NOV
    monthLong: string; // November
    year: string; // 2026
    time: string; // 8:00 PM
    timeRange: string; // 8:00 PM – 10:00 PM IST
  };
  where: string; // "Google Meet" / venue
  linkLabel?: string; // meet.google.com/abc-defg-hij
};

export type Template = {
  id: string;
  name: string;
  eventTypes: EventType[] | "all";
  modes: Mode[];
  /** extra score when these words appear in title/tagline/description */
  moods: string[];
  palettes: Palette[];
  render: (ctx: RenderCtx) => ReactElement;
};

export type Choice = { templateId: string; paletteId: string; seed: number };

export const POSTER_W = 1080;
export const POSTER_H = 1350;
