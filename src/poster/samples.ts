import { DEFAULT_HOUSES, placeholderLogo } from "./house-logos";
import type { EventType, PosterData, PosterHouse } from "./types";

export function sampleHouses(n: number): PosterHouse[] {
  return DEFAULT_HOUSES.slice(0, n).map((h) => ({ name: h.name, logo: placeholderLogo(h.name, h.color) }));
}

const BASE: Record<EventType, Omit<PosterData, "houses">> = {
  "music-night": {
    eventType: "music-night",
    title: "Music Night",
    tagline: "An evening of",
    description: "Open mic, acoustic covers and a whole lot of vibes.",
    date: "2026-11-14",
    startTime: "20:00",
    endTime: "22:00",
    mode: "online",
    meetLink: "https://meet.google.com/abc-defg-hij",
    highlights: ["Open Mic", "Live Covers", "Song Requests"],
  },
  "game-night": {
    eventType: "game-night",
    title: "Game Night",
    tagline: "Level up with your house",
    description: "Skribbl, Among Us, Codenames and a quiz showdown.",
    date: "2026-11-21",
    startTime: "21:00",
    endTime: "23:30",
    mode: "online",
    meetLink: "https://meet.google.com/xyz-pqrs-tuv",
    highlights: ["Skribbl.io", "Among Us", "Codenames", "Prizes"],
  },
  "movie-night": {
    eventType: "movie-night",
    title: "Movie Night",
    tagline: "Popcorn ready?",
    description: "A cult classic, a watch party and a post-credits chat.",
    date: "2026-11-28",
    startTime: "20:30",
    mode: "online",
    meetLink: "https://meet.google.com/mov-ieni-ght",
    highlights: ["Watch Party", "Trivia"],
  },
  "fun-night": {
    eventType: "fun-night",
    title: "Fun Night",
    tagline: "No syllabus. Just fun.",
    description: "Antakshari, dumb charades and surprise rounds.",
    date: "2026-12-05",
    startTime: "21:00",
    endTime: "23:00",
    mode: "online",
    meetLink: "https://meet.google.com/fun-nigh-tpv",
    highlights: ["Antakshari", "Dumb Charades", "Surprise Rounds"],
  },
  meetup: {
    eventType: "meetup",
    title: "Chandigarh Meetup",
    tagline: "Finally, faces behind the cameras",
    description: "Coffee, conversations and a walk around Sukhna Lake.",
    date: "2026-12-13",
    startTime: "16:00",
    endTime: "19:00",
    mode: "offline",
    venue: "Sukhna Lake, Sector 1, Chandigarh",
    highlights: ["Ice-breakers", "Snacks", "Group Photo"],
    region: "Chandigarh Region",
  },
  others: {
    eventType: "others",
    title: "Resume Clinic",
    tagline: "Pichavaram Career Series",
    description: "Seniors review your resume live.",
    date: "2026-12-19",
    startTime: "19:00",
    endTime: "20:30",
    mode: "online",
    meetLink: "https://meet.google.com/res-umec-lin",
    highlights: ["Live Reviews", "Q&A"],
  },
};

export function sample(type: EventType, houses = 1): PosterData {
  return { ...BASE[type], houses: sampleHouses(houses) };
}
