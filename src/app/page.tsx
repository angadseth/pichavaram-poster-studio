import Link from "next/link";
import { currentUser } from "@/lib/session";
import { TEMPLATES } from "@/poster/registry";

const FAN = [
  { x: "-200px", r: "-14deg" },
  { x: "-100px", r: "-7deg" },
  { x: "0px", r: "0deg" },
  { x: "100px", r: "7deg" },
  { x: "200px", r: "14deg" },
];

const CRESTS = ["pichavaram", "bandipur", "corbett", "kanha", "kaziranga", "nallamala", "namdapha", "saranda", "sundarbans", "wayanad"];

const STEPS = [
  { title: "Tell it the event", body: "Music night, game night, a city meetup. Pick the type, the date and time, and add the Meet link or the venue." },
  { title: "Add the houses", body: "Pichavaram is always on it. Tick every house you're collaborating with and their crests are placed for you." },
  { title: "Open your inbox", body: "The studio picks a design that suits the event and emails you a 1080 × 1350 poster within a minute." },
];

export default async function Home() {
  const user = await currentUser();
  // public/showcase/<id>.jpg is generated for every template by `npm run showcase`
  const fan = [TEMPLATES[1], TEMPLATES[4], TEMPLATES[0], TEMPLATES[9], TEMPLATES[7]].filter(Boolean);
  const wall = [...TEMPLATES, ...TEMPLATES];
  const cta = user ? "/studio" : "/login";

  return (
    <>
      <section className="shell pt-12 sm:pt-16">
        <h1 className="display masthead">
          Poster <em>Studio</em>
        </h1>
        <div className="rule mt-6" />
        <div className="grid items-center gap-8 pt-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="relative z-10 max-w-lg">
            <p className="display text-[clamp(28px,3.4vw,40px)] leading-[1.1]">
              Your event on a poster, in your inbox within a minute.
            </p>
            <p className="muted mt-5 text-[17px] leading-relaxed">
              The poster studio for Pichavaram House Regional Coordinators. Say what you&apos;re hosting; a designed poster,
              ready for WhatsApp and Instagram, lands in your email.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={cta} className="btn btn-brass">{user ? "Make a poster" : "Sign in to make a poster"}</Link>
              {user ? <Link href="/requests" className="btn btn-ghost">My posters</Link> : null}
            </div>
            <p className="muted mt-5 text-sm">Only RCs on the Pichavaram list can sign in. Ask the Web Admin to add you.</p>
          </div>
          <div className="fan overflow-x-clip" aria-label="Sample posters made by the studio">
            {fan.map((t, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={t.id}
                src={`/showcase/${t.id}.jpg`}
                alt={`${t.name} poster design`}
                style={{ ["--x" as string]: FAN[i].x, ["--r" as string]: FAN[i].r, zIndex: 5 - Math.abs(i - 2) }}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 border-y border-[var(--line)] py-8" aria-label="House crests">
        <div className="marquee" style={{ ["--dur" as string]: "50s", ["--gap" as string]: "44px" }}>
          <div className="marquee__track items-center">
            {[...CRESTS, ...CRESTS].map((id, i) => (
              <span key={i} className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/crests/${id}.webp`} alt="" width={52} height={52} className="crest" />
                <span className="display text-2xl capitalize text-[var(--ivory-2)]">{id}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="shell py-24">
        <h2 className="display text-[clamp(36px,5vw,64px)]">Three steps, no designer needed</h2>
        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((s, i) => (
            <li key={s.title} className="border-t border-[var(--line-2)] pt-6">
              <span className="display gold-text text-6xl">{i + 1}</span>
              <h3 className="mt-5 text-xl font-medium">{s.title}</h3>
              <p className="muted mt-2 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="pb-8">
        <div className="shell mb-10 flex flex-wrap items-end justify-between gap-6">
          <h2 className="display max-w-2xl text-[clamp(36px,5vw,64px)]">{TEMPLATES.length} designs, three colourways each</h2>
          <p className="muted max-w-sm">
            Each request gets the design that suits it, and the studio won&apos;t repeat your last two, so your posters never
            look alike.
          </p>
        </div>
        <div className="wall flex flex-col gap-6">
          <div className="marquee" style={{ ["--dur" as string]: "90s" }}>
            <div className="marquee__track">
              {wall.map((t, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={`/showcase/${t.id}.jpg`} alt={i < TEMPLATES.length ? `${t.name} poster design` : ""} loading="lazy" />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="shell pt-20 text-center">
        <p className="display text-[clamp(36px,5vw,64px)]">Got an event this week?</p>
        <Link href={cta} className="btn btn-brass mt-8">{user ? "Make a poster" : "Sign in to make a poster"}</Link>
      </section>
    </>
  );
}
