"use client";

import Link from "next/link";
import { useState } from "react";
import { EVENT_LABELS, EVENT_TYPES, type EventType, type Mode } from "@/lib/events";

type House = { id: string; name: string; logo: string };

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

const STEPS = ["Event", "Houses", "Details"];

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
  const [formError, setFormError] = useState("");
  const [sent, setSent] = useState(false);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const collab = houses.filter((h) => h.id !== "pichavaram");
  const pichavaram = houses.find((h) => h.id === "pichavaram");

  function pickType(t: EventType) {
    setEventType(t);
    setF((p) => ({
      ...p,
      mode: defaultMode(t),
      title: !p.title || Object.values(EVENT_LABELS).includes(p.title) ? (t === "others" ? "" : EVENT_LABELS[t]) : p.title,
    }));
    setStep(1);
  }

  async function send() {
    setBusy(true);
    setFormError("");
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { eventType, ...f, highlights: f.highlights.map((h) => h.trim()).filter(Boolean), houseIds },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.status === 401) return void window.location.assign("/login");
    if (!res.ok) {
      setErrors(data.errors ?? {});
      setFormError(data.error ?? "Couldn't send the request. Try again.");
      return;
    }
    setSent(true);
    window.scrollTo({ top: 0 });
  }

  if (sent) {
    return (
      <section className="mx-auto flex max-w-2xl flex-col items-center pt-10 text-center">
        <div className="envelope" aria-hidden>
          <div className="envelope__body" />
          <div className="envelope__flap" />
          <div className="envelope__seal" />
        </div>
        <h1 className="display mt-12 text-[clamp(44px,7vw,80px)]">
          Request <em>sent</em>
        </h1>
        <p className="muted mt-5 max-w-lg text-lg leading-relaxed">
          The Pichavaram design team has your <strong className="font-medium text-[var(--ivory)]">{f.title}</strong> brief. The
          finished poster comes to <strong className="font-medium text-[var(--ivory)]">{defaults.email}</strong> as soon as
          it&apos;s ready. You can close this page.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link className="btn btn-brass" href="/requests">Track my requests</Link>
          <button className="btn btn-ghost" onClick={() => window.location.reload()}>Request another poster</button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-12">
        <div className="steps" aria-hidden>
          {STEPS.map((s, i) => <i key={s} data-on={i <= step} />)}
        </div>
        <ol className="mt-4 flex gap-6 text-sm" aria-label="Steps">
          {STEPS.map((s, i) => {
            const reachable = i === 0 || Boolean(eventType);
            return (
              <li key={s}>
                <button
                  className={`transition ${i === step ? "text-[var(--gold-hi)]" : reachable ? "text-[var(--ivory-2)] hover:text-[var(--ivory)]" : "text-[var(--mute-2)]"}`}
                  disabled={!reachable || busy}
                  aria-current={i === step ? "step" : undefined}
                  onClick={() => setStep(i)}
                >
                  {i + 1}. {s}
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {step === 0 ? (
        <section>
          <h1 className="display text-[clamp(40px,6vw,72px)]">What are you hosting?</h1>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPES.map((t) => (
              <button key={t} className="tile min-h-[170px]" aria-pressed={eventType === t} onClick={() => pickType(t)}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#d6b36f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={EVENT_GLYPHS[t]} />
                </svg>
                <div className="display mt-6 text-[32px]">{EVENT_LABELS[t]}</div>
                <div className="muted mt-1 text-sm">{EVENT_BLURBS[t]}</div>
                <div className="mono mt-4 text-[var(--gold)]">{t === "meetup" ? "Offline" : t === "others" ? "Online or offline" : "Online"}</div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section>
          <h1 className="display text-[clamp(40px,6vw,72px)]">Who&apos;s collaborating?</h1>
          <p className="muted mt-3">Pichavaram is always on the poster. Pick none for a Pichavaram-only event.</p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pichavaram ? (
              <div className="tile flex items-center gap-4" aria-checked="true" role="checkbox" aria-disabled="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pichavaram.logo} alt="" width={52} height={52} className="crest" />
                <div>
                  <div className="display text-2xl">{pichavaram.name}</div>
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
                  <img src={h.logo} alt="" width={52} height={52} className="crest" />
                  <span className="display text-2xl">{h.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-12 flex justify-between">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-brass" onClick={() => setStep(2)}>
              Continue with {houseIds.length + 1} {houseIds.length ? "houses" : "house"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 && eventType ? (
        <section>
          <h1 className="display text-[clamp(40px,6vw,72px)]">The details</h1>
          <p className="muted mt-3">Everything the designer needs. Keep the wording short; posters read best with few words.</p>
          <form
            className="mt-10 grid gap-6 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
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
              <Field label="Meeting link" error={errors.meetLink || errors.mode} className="md:col-span-2" hint="Printed on the poster, usually as a QR code">
                <input className="input" type="url" required value={f.meetLink} onChange={(e) => set("meetLink", e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" aria-invalid={Boolean(errors.meetLink)} />
              </Field>
            ) : (
              <Field label="Venue" error={errors.venue || errors.mode} className="md:col-span-2">
                <input className="input" maxLength={80} required value={f.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Sukhna Lake, Sector 1, Chandigarh" aria-invalid={Boolean(errors.venue)} />
              </Field>
            )}
            <Field label="Highlights (optional, up to 4)" error={errors.highlights} className="md:col-span-2" hint="Short phrases for the poster, like Open Mic or Prizes">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {f.highlights.map((h, i) => (
                  <input key={i} className="input" maxLength={24} value={h} placeholder={["Open Mic", "Prizes", "Quiz", "Goodies"][i]}
                    onChange={(e) => set("highlights", f.highlights.map((x, k) => (k === i ? e.target.value : x)))} />
                ))}
              </div>
            </Field>
            <Field label="Anything the designer should know? (optional)" error={errors.notes} className="md:col-span-2" hint="The feel you want, colours, a theme, a reference poster">
              <textarea className="input" maxLength={500} value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Retro vibe, Bollywood theme, keep it classy…" />
            </Field>
            <Field label="Who is hosting?" error={errors.hostName} className="md:col-span-2" hint="Kept in the records only. It is not printed on the poster.">
              <input className="input" maxLength={60} required value={f.hostName} onChange={(e) => set("hostName", e.target.value)} placeholder="Your name" aria-invalid={Boolean(errors.hostName)} />
            </Field>
            {formError ? <p className="text-sm text-[var(--danger)] md:col-span-2" role="alert">{formError}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6 md:col-span-2">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <div className="flex flex-wrap items-center gap-4">
                <span className="muted text-sm">The poster comes to {defaults.email}</span>
                <button className="btn btn-brass" disabled={busy}>{busy ? "Sending…" : "Send request"}</button>
              </div>
            </div>
          </form>
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
