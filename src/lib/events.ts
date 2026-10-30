export const EVENT_TYPES = ["music-night", "game-night", "movie-night", "fun-night", "meetup", "others"] as const;
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

export function fmtTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Sat, 20 Dec 2026, 8:00 PM – 10:00 PM IST" */
export function fmtWhen(e: { date: string; startTime: string; endTime?: string }): string {
  return `${fmtDate(e.date)}, ${fmtTime(e.startTime)}${e.endTime ? ` – ${fmtTime(e.endTime)}` : ""} IST`;
}

export function fmtStamp(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}
