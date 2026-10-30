import { z } from "zod";
import { EVENT_TYPES, type EventType, type Mode } from "./events";

export const LIMITS = {
  title: 60,
  tagline: 70,
  description: 200,
  venue: 80,
  highlight: 24,
  highlights: 4,
  host: 60,
  notes: 500,
} as const;

/** Meetups happen offline; music/game/movie/fun nights are online; "others" can be either. */
export function allowedModes(type: EventType): Mode[] {
  if (type === "meetup") return ["offline"];
  if (type === "others") return ["online", "offline"];
  return ["online"];
}

/** Today's date in IST as YYYY-MM-DD. */
export function todayIST(now = new Date()): string {
  return new Date(now.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

export function requestSchema(now = new Date()) {
  const today = todayIST(now);
  const maxDate = todayIST(new Date(now.getTime() + 366 * 24 * 3600 * 1000));
  return z
    .object({
      eventType: z.enum(EVENT_TYPES),
      title: z.string().trim().min(2, "Give the event a title").max(LIMITS.title, `Keep the title under ${LIMITS.title} characters`),
      tagline: optionalText(LIMITS.tagline),
      description: optionalText(LIMITS.description),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date")
        .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), "Pick a valid date")
        .refine((d) => d >= today, "The date is in the past")
        .refine((d) => d <= maxDate, "Pick a date within the next year"),
      startTime: time,
      endTime: time.optional().or(z.literal("").transform(() => undefined)),
      mode: z.enum(["online", "offline"]),
      meetLink: z.string().trim().optional(),
      venue: optionalText(LIMITS.venue),
      highlights: z
        .array(z.string().trim().max(LIMITS.highlight, `Each highlight under ${LIMITS.highlight} characters`))
        .max(LIMITS.highlights)
        .default([])
        .transform((a) => [...new Set(a.filter(Boolean))]),
      houseIds: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(12).default([]),
      region: optionalText(40),
      hostName: z.string().trim().min(2, "Who is hosting?").max(LIMITS.host),
      notes: optionalText(LIMITS.notes),
    })
    .superRefine((v, ctx) => {
      if (!allowedModes(v.eventType).includes(v.mode)) {
        ctx.addIssue({ code: "custom", path: ["mode"], message: `${v.eventType === "meetup" ? "Meetups are offline" : "This event is online"}` });
      }
      if (v.mode === "online") {
        let ok = false;
        try {
          const u = new URL(v.meetLink ?? "");
          ok = u.protocol === "https:" && u.hostname.includes(".");
        } catch {}
        if (!ok) ctx.addIssue({ code: "custom", path: ["meetLink"], message: "Paste the full meeting link (https://meet.google.com/…)" });
      }
      if (v.mode === "offline" && (!v.venue || v.venue.length < 3)) {
        ctx.addIssue({ code: "custom", path: ["venue"], message: "Where is it happening?" });
      }
      if (v.endTime && v.endTime === v.startTime) {
        ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must differ from start time" });
      }
    })
    .transform((v) => ({
      ...v,
      meetLink: v.mode === "online" ? v.meetLink : undefined,
      venue: v.mode === "offline" ? v.venue : undefined,
    }));
}

export type RequestInput = z.output<ReturnType<typeof requestSchema>>;

export function parseRequest(body: unknown, now = new Date()) {
  const r = requestSchema(now).safeParse(body);
  if (r.success) return { ok: true as const, data: r.data };
  const errors: Record<string, string> = {};
  for (const issue of r.error.issues) {
    const k = String(issue.path[0] ?? "form");
    errors[k] ??= issue.message;
  }
  return { ok: false as const, errors };
}
