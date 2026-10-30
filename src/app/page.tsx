import Link from "next/link";
import { currentUser } from "@/lib/session";

const CRESTS = ["pichavaram", "bandipur", "corbett", "kanha", "kaziranga", "nallamala", "namdapha", "saranda", "sundarbans", "wayanad"];

// sample requests on the hero, as job tickets moving through the studio
const TICKETS = [
  { x: "-150px", r: "-11deg", kind: "Meetup", title: "Chai & Baatcheet", date: "Sun, 14 Dec", houses: ["pichavaram", "kanha"], status: "Delivered" },
  { x: "0px", r: "0deg", kind: "Music Night", title: "Unplugged Evening", date: "Sat, 20 Dec", houses: ["pichavaram", "corbett", "saranda"], status: "In design" },
  { x: "150px", r: "11deg", kind: "Game Night", title: "Skribbl Showdown", date: "Fri, 26 Dec", houses: ["pichavaram", "wayanad"], status: "Received" },
];

const STEPS = [
  { title: "Send the brief", body: "The event, the date and time, the Meet link or venue, and the houses you're collaborating with. Two minutes." },
  { title: "A designer makes it", body: "The Web Admin hands it to someone on the Pichavaram design team, with every house crest attached." },
  { title: "It lands in your inbox", body: "The finished poster is emailed to you, ready for WhatsApp and Instagram. Track it here meanwhile." },
];

export default async function Home() {
  const user = await currentUser();
  const cta = user ? "/studio" : "/login";

  return (
    <>
      <section className="shell pt-12 sm:pt-16">
        <h1 className="display masthead">
          Poster <em>Studio</em>
        </h1>
        <div className="rule mt-6" />
        <div className="grid items-center gap-8 pt-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="relative z-10 max-w-lg">
            <p className="display text-[clamp(28px,3.4vw,40px)] leading-[1.1]">
              Tell us about your event. The design team makes the poster.
            </p>
            <p className="muted mt-5 text-[17px] leading-relaxed">
              For Pichavaram House Regional Coordinators. Ask for a poster in one form; a designer from the house makes it
              and it&apos;s emailed straight to you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={cta} className="btn btn-brass">{user ? "Request a poster" : "Sign in to request a poster"}</Link>
              {user ? <Link href="/requests" className="btn btn-ghost">My requests</Link> : null}
            </div>
            <p className="muted mt-5 text-sm">Only RCs on the Pichavaram list can sign in. Ask the Web Admin to add you.</p>
          </div>
          <div className="fan overflow-x-clip" aria-hidden>
            {TICKETS.map((t, i) => (
              <div
                key={t.title}
                className="ticket aspect-[4/5]"
                style={{ ["--x" as string]: t.x, ["--r" as string]: t.r, zIndex: i === 1 ? 3 : 1 }}
              >
                <span className="mono text-[var(--mute)]">{t.kind}</span>
                <div className="mt-4 flex gap-1.5">
                  {t.houses.map((h) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={h} src={`/crests/${h}.webp`} alt="" width={30} height={30} className="crest" />
                  ))}
                </div>
                <span className="display mt-auto text-[40px] leading-[.95]">{t.title}</span>
                <span className="mt-3 text-sm text-[var(--ivory-2)]">{t.date}</span>
                <span className={`chip mt-5 self-start ${t.status === "Delivered" ? "chip-ok" : "chip-wait"}`}>{t.status}</span>
              </div>
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
        <h2 className="display text-[clamp(36px,5vw,64px)]">How a poster gets made</h2>
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

      <section className="shell pt-8 text-center">
        <p className="display text-[clamp(36px,5vw,64px)]">Got an event coming up?</p>
        <Link href={cta} className="btn btn-brass mt-8">{user ? "Request a poster" : "Sign in to request a poster"}</Link>
      </section>
    </>
  );
}
