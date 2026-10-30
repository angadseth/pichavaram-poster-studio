import { describe, expect, it } from "vitest";
import { parseRequest, todayIST } from "@/lib/validation";

const NOW = new Date("2026-10-29T12:00:00Z");
const base = {
  eventType: "music-night",
  title: "Music Night",
  date: "2026-11-14",
  startTime: "20:00",
  mode: "online",
  meetLink: "https://meet.google.com/abc-defg-hij",
  hostName: "Asha",
  houseIds: ["kanha"],
  highlights: ["Open Mic", "", "Open Mic"],
};

describe("request validation", () => {
  it("accepts a normal online request and cleans highlights", () => {
    const r = parseRequest(base, NOW);
    expect(r.ok && r.data.highlights).toEqual(["Open Mic"]);
  });

  it("rejects past dates and bad meet links", () => {
    const r = parseRequest({ ...base, date: "2026-10-01", meetLink: "meet.google.com/x" }, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.date).toMatch(/past/);
      expect(r.errors.meetLink).toBeTruthy();
    }
  });

  it("forces meetups offline with a venue", () => {
    const r = parseRequest({ ...base, eventType: "meetup", mode: "online" }, NOW);
    expect(!r.ok && r.errors.mode).toMatch(/offline/);
    const ok = parseRequest({ ...base, eventType: "meetup", mode: "offline", venue: "Sukhna Lake" }, NOW);
    expect(ok.ok && ok.data.meetLink).toBeUndefined();
  });

  it("requires a host and caps title length", () => {
    const r = parseRequest({ ...base, hostName: " ", title: "x".repeat(61) }, NOW);
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(["hostName", "title"]);
  });

  it("uses IST for today", () => {
    expect(todayIST(new Date("2026-10-29T19:00:00Z"))).toBe("2026-10-30");
  });
});
