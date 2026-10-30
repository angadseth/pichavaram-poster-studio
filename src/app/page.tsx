import Link from "next/link";
import { currentUser } from "@/lib/session";
import { TEMPLATES } from "@/poster/registry";

const FAN = [
  { x: "-190px", r: "-14deg" },
  { x: "-95px", r: "-7deg" },
  { x: "0px", r: "0deg" },
  { x: "95px", r: "7deg" },
  { x: "190px", r: "14deg" },
];

const STEPS = [
  { title: "Describe the event", body: "Music night, game night, a city meetup: pick the type, the date and time, and add the Meet link or venue." },
  { title: "Choose the houses", body: "Pichavaram is always on it. Add every collaborating house and their logos are placed for you." },
  { title: "Check your inbox", body: "The studio picks a design that suits the event and emails you a 1080×1350 poster in about a minute." },
];

export default async function Home() {
  const user = await currentUser();
  // public/showcase/<id>.jpg is generated for every template by `npm run showcase`
  const shown = TEMPLATES;
  const fan = shown.slice(0, 5);
  const cta = user ? "/studio" : "/login";

  return (
    <div className="shell">
      <section className="grid items-center gap-10 overflow-x-clip pt-8 pb-16 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
        <div className="relative z-10 max-w-xl">
          <h1 className="display text-[clamp(44px,7vw,84px)] leading-[0.98]">
            Your event, on a poster, in a minute.
          </h1>
          <p className="muted mt-6 text-lg leading-relaxed">
            The poster studio for Pichavaram House Regional Coordinators. Tell it what you&apos;re hosting and a designed
            poster lands in your inbox, ready for WhatsApp and Instagram.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={cta} className="btn btn-brass">{user ? "Request a poster" : "Sign in to request a poster"}</Link>
            {user ? <Link href="/requests" className="btn btn-ghost">See my posters</Link> : null}
          </div>
          <p className="muted mt-6 text-sm">Only RCs on the Pichavaram list can sign in. Ask the Web Admin to add you.</p>
        </div>
        <div className="fan" aria-label="Sample posters made by the studio">
          {fan.map((t, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={t.id}
              src={`/showcase/${t.id}.jpg`}
              alt={`${t.name} poster design`}
              style={{ ["--x" as string]: FAN[i].x, ["--r" as string]: FAN[i].r, zIndex: i === 2 ? 5 : 5 - Math.abs(i - 2) }}
            />
          ))}
        </div>
      </section>

      <section className="py-14">
        <h2 className="display text-3xl sm:text-4xl">How it works</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="panel p-7">
              <span className="display text-5xl text-[var(--brass)]">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="muted mt-2 leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {shown.length ? (
        <section className="py-14">
          <h2 className="display text-3xl sm:text-4xl">{shown.length} designs, each in three colourways</h2>
          <p className="muted mt-3 max-w-2xl">
            Every request gets the design that fits it best, and the studio avoids repeating your last couple of designs so
            your posters don&apos;t look alike.
          </p>
          <div className="strip mt-8">
            {shown.map((t) => (
              <figure key={t.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/showcase/${t.id}.jpg`} alt={`${t.name} poster design`} loading="lazy" />
                <figcaption className="muted mt-3 text-sm">{t.name}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
