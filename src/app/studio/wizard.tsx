"use client";

import { useState } from "react";
import { EVENT_LABELS, EVENT_TYPES, type EventType, type Mode } from "@/poster/types";

type House = { id: string; name: string; logo: string };
type Choice = { templateId: string; paletteId: string; seed: number };

const EVENT_BLURBS: Record<EventType, string> = {
  "music-night": "Open mics, jams, karaoke",
  "game-night": "Skribbl, quizzes, tournaments",
  "movie-night": "Watch parties and screenings",
  "fun-night": "Antakshari, charades, chaos",
  meetup: "In person, in your city",
  others: "Talks, workshops, anything else",
};

const EVENT_GLYPHS: Record<EventType, string> = {
  "music-night": "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  "game-night": "M6 11h4M8 9v4M15 12h.01M18 10h.01M17.3 5H6.7a4 4 0 0 0-4 3.6l-.7 6.2A2.8 2.8 0 0 0 4.8 18c.9 0 1.7-.4 2.2-1.1L8.5 15h7l1.5 1.9c.5.7 1.3 1.1 2.2 1.1a2.8 2.8 0 0 0 2.8-3.2l-.7-6.2A4 4 0 0 0 17.3 5Z",
  "movie-night": "M3 7h18v13H3zM3 7l3-4M9 7l3-4M15 7l3-4M10 11l5 3-5 3z",
  "fun-night": "M12 2l2.4 6.9H22l-6 4.6 2.3 7.1L12 16.3 5.7 20.6 8 13.5 2 8.9h7.6z",
  meetup: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  others: "M12 5v14M5 12h14",
};

const STEPS = ["Event", "Houses", "Details", "Preview"];

function defaultMode(t: EventType): Mode {
  return t === "meetup" ? "offline" : "online";
}

export function Wizard({
  houses,
  defaults,
  today,
}: {
  houses: House[];
  defaults: { hostName: string; region: string; email: string };
  today: string;
}) {
  const [step, setStep] = useState(0);
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [houseIds, setHouseIds] = useState<string[]>([]);
  const [f, setF] = useState({
    title: "",
    tagline: "",
    description: "",
    date: "",
    startTime: "20:00",
    endTime: "",
    mode: "online" as Mode,
    meetLink: "",
    venue: "",
    highlights: ["", "", "", ""],
    region: defaults.region,
    hostName: defaults.hostName,
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ image: string; choice: Choice } | null>(null);
  const [seen, setSeen] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState<{ id: string; status: string; error: string | null } | null>(null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const collab = houses.filter((h) => h.id !== "pichavaram");
  const pichavaram = houses.find((h) => h.id === "pichavaram");

  function input() {
    return {
      eventType,
      ...f,
      highlights: f.highlights.map((h) => h.trim()).filter(Boolean),
      houseIds,
    };
  }

  function pickType(t: EventType) {
    setEventType(t);
    setF((p) => ({
      ...p,
      mode: defaultMode(t),
      title: !p.title || Object.values(EVENT_LABELS).includes(p.title) ? (t === "others" ? "" : EVENT_LABELS[t]) : p.title,
    }));
    setStep(1);
  }

  async function render(opts: { shuffle?: boolean } = {}) {
    setBusy(true);
    setFormError("");
    const avoid = opts.shuffle && preview ? [...seen, preview.choice.templateId] : [];
    const res = await fetch("/api/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: input(), avoid }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) return void window.location.assign("/login");
    if (!res.ok) {
      if (data.errors) {
        setErrors(data.errors);
        setStep(2);
      }
      setFormError(data.error ?? "Couldn't make the preview.");
      return;
    }
    setErrors({});
    if (opts.shuffle && preview) setSeen((s) => [...s, preview.choice.templateId].slice(-8));
    setPreview({ image: data.image, choice: data.choice });
    setStep(3);
  }

  async function send() {
    if (!preview) return;
    setBusy(true);
    setFormError("");
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: input(), choice: preview.choice }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) return void window.location.assign("/login");
    if (!res.ok) {
      if (data.errors) {
        setErrors(data.errors);
        setStep(2);
      }
      setFormError(data.error ?? "Couldn't send the request.");
      return;
    }
    setDone(data);
  }

  if (done) {
    const ok = done.status === "sent";
    return (
      <div className="mx-auto grid max-w-4xl items-center gap-10 py-6 md:grid-cols-[320px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview ? <img src={preview.image} alt="Your poster" className="w-full rounded-2xl shadow-2xl" /> : null}
        <div>
          <h1 className="display text-5xl">{ok ? "Sent. Check your inbox." : "Your poster is ready"}</h1>
          <p className="muted mt-4 text-lg leading-relaxed">
            {ok
              ? `The full-size poster is on its way to ${defaults.email}. It usually arrives within a minute.`
              : "The email didn't go through, but the poster is saved. Download it below or retry the email from My posters."}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a className="btn btn-brass" href={`/api/posters/${done.id}?download=1`}>Download PNG</a>
            <a className="btn btn-ghost" href={`/requests/${done.id}`}>View request</a>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>Make another poster</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <ol className="mb-10 flex flex-wrap items-center gap-2 text-sm" aria-label="Steps">
        {STEPS.map((s, i) => {
          const reachable = i <= step || (i === 1 && eventType) || (i === 2 && eventType);
          return (
            <li key={s} className="flex items-center gap-2">
              <button
                className={`rounded-full px-4 py-2 transition ${i === step ? "bg-[var(--brass)] text-[#1b1408]" : reachable ? "text-[var(--pearl)] hover:bg-white/5" : "text-[var(--mist)] opacity-50"}`}
                disabled={!reachable || busy}
                aria-current={i === step ? "step" : undefined}
                onClick={() => (i === 3 ? render() : setStep(i))}
              >
                {i + 1}. {s}
              </button>
              {i < STEPS.length - 1 ? <span className="h-px w-6 bg-[var(--line)]" aria-hidden /> : null}
            </li>
          );
        })}
      </ol>

      {step === 0 ? (
        <section>
          <h1 className="display text-4xl sm:text-5xl">What are you hosting?</h1>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPES.map((t) => (
              <button key={t} className="tile" aria-pressed={eventType === t} onClick={() => pickType(t)}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c9a15a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={EVENT_GLYPHS[t]} />
                </svg>
                <div className="mt-4 text-lg font-semibold">{EVENT_LABELS[t]}</div>
                <div className="muted mt-1 text-sm">{EVENT_BLURBS[t]}</div>
                <div className="mt-3 text-xs text-[var(--brass-soft)]">{t === "meetup" ? "Offline" : t === "others" ? "Online or offline" : "Online"}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section>
          <h1 className="display text-4xl sm:text-5xl">Which houses are collaborating?</h1>
          <p className="muted mt-3">Pichavaram is always included. Pick none for a Pichavaram-only event.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pichavaram ? (
              <div className="tile flex items-center gap-4" aria-checked="true" role="checkbox" aria-disabled="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pichavaram.logo} alt="" width={44} height={44} className="rounded-full" />
                <div>
                  <div className="font-semibold">{pichavaram.name}</div>
                  <div className="muted text-xs">Host house</div>
                </div>
              </div>
            ) : null}
            {collab.map((h) => {
              const on = houseIds.includes(h.id);
              return (
                <button
                  key={h.id}
                  className="tile flex items-center gap-4"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => setHouseIds((ids) => (on ? ids.filter((x) => x !== h.id) : [...ids, h.id]))}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={h.logo} alt="" width={44} height={44} className="rounded-full" />
                  <span className="font-semibold">{h.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-10 flex justify-between">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-brass" onClick={() => setStep(2)}>
              Continue with {houseIds.length + 1} {houseIds.length ? "houses" : "house"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 && eventType ? (
        <section>
          <h1 className="display text-4xl sm:text-5xl">The details</h1>
          <p className="muted mt-3">This is what goes on the poster. Keep it short, posters read best with few words.</p>
          <form
            className="mt-8 grid gap-6 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              render();
            }}
          >
            <Field label="Event title" error={errors.title} className="md:col-span-2" hint="Up to 60 characters">
              <input className="input" maxLength={60} required value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Music Night" aria-invalid={Boolean(errors.title)} />
            </Field>
            <Field label="Tagline (optional)" error={errors.tagline} hint="A short line above or below the title">
              <input className="input" maxLength={70} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} placeholder="An evening of unplugged covers" />
            </Field>
            <Field label="Region (optional)" error={errors.region}>
              <input className="input" maxLength={40} value={f.region} onChange={(e) => set("region", e.target.value)} placeholder="Chandigarh Region" />
            </Field>
            <Field label="Date" error={errors.date}>
              <input className="input" type="date" min={today} required value={f.date} onChange={(e) => set("date", e.target.value)} aria-invalid={Boolean(errors.date)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Starts (IST)" error={errors.startTime}>
                <input className="input" type="time" required value={f.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </Field>
              <Field label="Ends (optional)" error={errors.endTime}>
                <input className="input" type="time" value={f.endTime} onChange={(e) => set("endTime", e.target.value)} />
              </Field>
            </div>
            {eventType === "others" ? (
              <Field label="Where is it?" className="md:col-span-2">
                <div className="flex gap-3">
                  {(["online", "offline"] as Mode[]).map((m) => (
                    <button type="button" key={m} className="tile flex-1 py-3 text-center" aria-pressed={f.mode === m} onClick={() => set("mode", m)}>
                      {m === "online" ? "Online (Google Meet)" : "Offline (venue)"}
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}
            {f.mode === "online" ? (
              <Field label="Meeting link" error={errors.meetLink || errors.mode} className="md:col-span-2" hint="A QR code for this link is printed on the poster">
                <input className="input" type="url" required value={f.meetLink} onChange={(e) => set("meetLink", e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" aria-invalid={Boolean(errors.meetLink)} />
              </Field>
            ) : (
              <Field label="Venue" error={errors.venue || errors.mode} className="md:col-span-2">
                <input className="input" maxLength={80} required value={f.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Sukhna Lake, Sector 1, Chandigarh" aria-invalid={Boolean(errors.venue)} />
              </Field>
            )}
            <Field label="Highlights (optional, up to 4)" error={errors.highlights} className="md:col-span-2" hint="Short phrases shown as tags, like Open Mic or Prizes">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {f.highlights.map((h, i) => (
                  <input key={i} className="input" maxLength={24} value={h} placeholder={["Open Mic", "Prizes", "Quiz", "Goodies"][i]}
                    onChange={(e) => set("highlights", f.highlights.map((x, k) => (k === i ? e.target.value : x)))} />
                ))}
              </div>
            </Field>
            <Field label="What should the poster feel like? (optional)" error={errors.notes} className="md:col-span-2" hint="Words like retro, elegant, chill or quiz help the studio pick a design">
              <textarea className="input" maxLength={500} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Retro vibe, Bollywood theme, keep it classy…" />
            </Field>
            <Field label="Who is hosting?" error={errors.hostName} className="md:col-span-2" hint="Kept in the records only. It is not printed on the poster.">
              <input className="input" maxLength={60} required value={f.hostName} onChange={(e) => set("hostName", e.target.value)} placeholder="Your name" aria-invalid={Boolean(errors.hostName)} />
            </Field>
            {formError ? <p className="text-sm text-[var(--danger)] md:col-span-2" role="alert">{formError}</p> : null}
            <div className="flex justify-between md:col-span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-brass" disabled={busy}>{busy ? "Designing your poster…" : "Preview poster"}</button>
            </div>
          </form>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid items-start gap-10 md:grid-cols-[minmax(0,460px)_1fr]">
          <div className={`relative aspect-[4/5] w-full overflow-hidden rounded-2xl ${busy ? "shimmer" : ""}`}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.image} alt="Poster preview" className={`h-full w-full transition-opacity duration-300 ${busy ? "opacity-40" : ""}`} />
            ) : null}
          </div>
          <div>
            <h1 className="display text-4xl sm:text-5xl">Here&apos;s your poster</h1>
            <p className="muted mt-4 leading-relaxed">
              Not feeling it? Try another design, as many times as you like. When it looks right, send it and the full-size
              PNG goes to <strong className="text-[var(--pearl)]">{defaults.email}</strong>.
            </p>
            {formError ? <p className="mt-4 text-sm text-[var(--danger)]" role="alert">{formError}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <button className="btn btn-brass" disabled={busy || !preview} onClick={send}>{busy ? "Working…" : "Send poster to my email"}</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => render({ shuffle: true })}>Try another design</button>
              <button className="btn btn-ghost" disabled={busy} onClick={() => setStep(2)}>Edit details</button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
      {error ? <span className="err" role="alert">{error}</span> : hint ? <small>{hint}</small> : null}
    </label>
  );
}
