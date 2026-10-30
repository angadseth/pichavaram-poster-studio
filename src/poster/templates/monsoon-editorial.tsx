import { Art, Frame, Grain, Layer, Logos, Qr, Spacer, collabLine } from "../kit";
import type { RenderCtx, Template } from "../types";
import { EVENT_LABELS } from "../types";
import { fitSize, truncate } from "../util";

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex: string, a: number) {
  return `rgba(${rgb(hex).join(",")},${a})`;
}

/** feColorMatrix that turns turbulence into soft cloud alpha of one colour. */
function cloudMatrix(hex: string, gain: number, cut: number) {
  const [r, g, b] = rgb(hex).map((v) => (v / 255).toFixed(3));
  return `0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${gain} ${-cut}`;
}

function art({ p, rng }: RenderCtx) {
  const sx = 700 + rng() * 160;
  const sy = 470 + rng() * 60;
  const horizon = 700 + rng() * 30;
  const seed = Math.floor(rng() * 900);
  const rain = Array.from({ length: 170 }, () => {
    const x = rng() * 1180 - 60;
    const y = 160 + rng() * 820;
    const len = 30 + rng() * 120;
    const o = (0.06 + rng() * 0.22).toFixed(2);
    return `<line x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${(x - len * 0.22).toFixed(0)}" y2="${(y + len).toFixed(0)}" stroke="${p.ink}" stroke-opacity="${o}" stroke-width="${rng() > 0.85 ? 2 : 1}"/>`;
  }).join("");
  const shimmer = Array.from({ length: 22 }, (_, i) => {
    const y = horizon + 14 + i * 9 + rng() * 4;
    const w = (160 - i * 5) * (0.5 + rng() * 0.8);
    const x = sx - w / 2 + (rng() - 0.5) * 50;
    return `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${w.toFixed(0)}" height="${(2 + rng() * 2).toFixed(1)}" rx="2" fill="${p.accent}" fill-opacity="${(0.5 - i * 0.02).toFixed(2)}"/>`;
  }).join("");
  const ripples = Array.from({ length: 9 }, () => {
    const x = 80 + rng() * 920;
    const y = horizon + 60 + rng() * 170;
    const r = 18 + rng() * 40;
    return `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * 0.22).toFixed(1)}" fill="none" stroke="${p.ink}" stroke-opacity="0.18"/><ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(r * 0.5).toFixed(0)}" ry="${(r * 0.11).toFixed(1)}" fill="none" stroke="${p.ink}" stroke-opacity="0.22"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.12" stop-color="${p.bg}"/><stop offset="0.38" stop-color="${p.bg2}"/><stop offset="0.52" stop-color="${p.accent2}" stop-opacity="0.9"/><stop offset="0.56" stop-color="${p.bg2}"/><stop offset="0.8" stop-color="${p.bg}"/>
      </linearGradient>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0.1" stop-color="#fff" stop-opacity="0"/><stop offset="0.24" stop-color="#fff"/><stop offset="0.56" stop-color="#fff"/><stop offset="0.74" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <mask id="m"><rect width="1080" height="1350" fill="url(#fade)"/></mask>
      <radialGradient id="glow"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.55"/><stop offset="0.45" stop-color="${p.accent}" stop-opacity="0.22"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="core"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.85"/><stop offset="0.82" stop-color="${p.accent}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
      <filter id="cd" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0035 0.011" numOctaves="3" seed="${seed}"/><feColorMatrix type="matrix" values="${cloudMatrix(p.bg, 2.2, 0.9)}"/></filter>
      <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.1" fill="${p.ink}"/></pattern>
    </defs>
    <rect width="1080" height="1350" fill="${p.bg}"/>
    <g mask="url(#m)">
      <rect width="1080" height="1350" fill="url(#sky)"/>
      <circle cx="${sx}" cy="${sy}" r="340" fill="url(#glow)"/>
      <circle cx="${sx}" cy="${sy}" r="122" fill="url(#core)"/>
      <rect x="0" y="120" width="1080" height="${horizon - 80}" filter="url(#cd)" opacity="0.85"/>
      <path d="M0 ${horizon} C 180 ${horizon - 40} 300 ${horizon - 14} 460 ${horizon - 30} S 760 ${horizon - 6} 1080 ${horizon - 36} L 1080 ${horizon + 6} L 0 ${horizon + 6} Z" fill="${p.bg}" fill-opacity="0.7"/>
      <rect x="0" y="${horizon}" width="1080" height="400" fill="${p.bg}" fill-opacity="0.45"/>
      <ellipse cx="${sx}" cy="${horizon + 110}" rx="120" ry="200" fill="url(#glow)" opacity="0.6"/>
      ${shimmer}
      ${ripples}
      ${rain}
      <rect width="1080" height="1350" fill="url(#dots)" opacity="0.07"/>
    </g>
  </svg>`;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const monthNum = data.date.split("-")[1];
  const head = truncate(data.title, 60).toUpperCase();
  const size = fitSize(head, { width: 960, maxLines: 3, max: 196, min: 80, k: 0.5 });
  const tagline = truncate(data.tagline, 72);
  const venue = ctx.where.trim();
  const vSize = fitSize(venue, { width: ctx.qr ? 380 : 580, maxLines: 3, max: 44, min: 24, k: 0.5 });
  // the sticker names the event type; "Others" has no meaningful label, so it is left off
  const edition = data.eventType === "others" ? undefined : EVENT_LABELS[data.eventType].toUpperCase();
  const label = { display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 4, color: p.accent } as const;
  const rule = <div style={{ display: "flex", width: 1, alignSelf: "stretch", background: rgba(p.ink, 0.35), margin: "0 28px" }} />;
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={0.13} />
      <Layer style={{ padding: "44px 56px 50px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: p.ink }}>
          <div style={{ display: "flex" }}>{`ISSUE Nº ${when.day}·${monthNum}`}</div>
          <div style={{ display: "flex", color: p.accent }}>{truncate(collabLine(data.houses).toUpperCase(), 36)}</div>
          <div style={{ display: "flex" }}>IITM · BS DEGREE</div>
        </div>
        <div style={{ display: "flex", height: 2, background: p.ink, margin: "12px 0 8px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontFamily: "DMSerif", fontSize: 112, lineHeight: 1, letterSpacing: -3, color: p.ink }}>Pichavaram</div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, paddingBottom: 14 }}>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: p.accent }}>
              {`${when.weekday} · ${when.day} ${when.monthLong.toUpperCase()} ${when.year}`}
            </div>
            <div style={{ display: "flex", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 26, color: p.muted }}>the house journal</div>
          </div>
        </div>
        <div style={{ display: "flex", height: 1, background: p.ink, marginTop: 6 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 34 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 540 }}>
            {data.highlights.slice(0, 4).map((h, i) => (
              <div key={h} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "10px 0", borderBottom: `1px solid ${rgba(p.ink, 0.28)}` }}>
                <div style={{ display: "flex", fontFamily: "Anton", fontSize: 28, color: p.accent }}>{`0${i + 1}`}</div>
                <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 24, letterSpacing: 2, color: p.ink }}>
                  {truncate(h, 28).toUpperCase()}
                </div>
              </div>
            ))}
          </div>
          {edition ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 168,
              height: 168,
              borderRadius: 168,
              background: p.accent,
              transform: "rotate(9deg)",
              marginRight: 10,
            }}
          >
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: p.bg }}>THE</div>
            <div style={{ display: "flex", fontFamily: "Anton", fontSize: edition.length > 7 ? 30 : 38, lineHeight: 1.05, color: p.bg }}>{edition}</div>
            <div style={{ display: "flex", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 26, lineHeight: 1, color: p.bg }}>edition</div>
          </div>
          ) : null}
        </div>
        <Spacer />
        <div style={{ display: "flex", fontFamily: "Anton", fontSize: size, lineHeight: 0.92, color: p.ink, maxWidth: 968, letterSpacing: -1, wordBreak: "break-word" }}>{head}</div>
        {tagline ? (
          <div style={{ display: "flex", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 38, color: p.muted, marginTop: 14, maxWidth: 968, wordBreak: "break-word" }}>{tagline}</div>
        ) : null}
        <div style={{ display: "flex", height: 2, flexShrink: 0, background: p.ink, margin: "28px 0 22px" }} />
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 270, flexShrink: 0 }}>
            <div style={label}>WHEN</div>
            <div style={{ display: "flex", fontFamily: "Anton", fontSize: 70, lineHeight: 1.1, color: p.ink }}>{`${when.day} ${when.month}`}</div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 19, letterSpacing: 3, color: p.muted }}>
              {when.weekdayLong.toUpperCase()}
            </div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 21, color: p.ink, marginTop: 4 }}>{when.timeRange}</div>
          </div>
          {rule}
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 8 }}>
            <div style={label}>{data.mode === "online" ? "JOIN ON" : "WHERE"}</div>
            <div style={{ display: "flex", fontFamily: "DMSerif", fontSize: vSize, lineHeight: 1.12, color: p.ink, maxWidth: ctx.qr ? 400 : 600, wordBreak: "break-word" }}>{venue}</div>
            {ctx.linkLabel ? (
              <div style={{ display: "flex", fontFamily: "Mono", fontSize: 20, color: p.muted }}>{truncate(ctx.linkLabel, 34)}</div>
            ) : null}
          </div>
          {ctx.qr ? rule : null}
          <Qr ctx={ctx} ink={p.muted} size={118} label="Scan" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 26, gap: 24 }}>
          {data.houses.length === 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Logos houses={data.houses} plate="#FFFDF8" ring={p.accent} max={76} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={label}>PUBLISHED BY</div>
                <div style={{ display: "flex", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 32, color: p.ink }}>{data.houses[0].name}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexShrink: 0 }}>
              <Logos houses={data.houses} plate="#FFFDF8" ring={p.accent} max={64} gap={14} width={620} justify="flex-start" />
            </div>
          )}
          <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: p.muted, paddingBottom: 6 }}>
            {data.mode === "online" ? "AN ONLINE EVENT" : "AN IN-PERSON EVENT"}
          </div>
        </div>
      </Layer>
    </Frame>
  );
}

export const monsoonEditorial: Template = {
  id: "monsoon-editorial",
  name: "Monsoon Editorial",
  eventTypes: ["meetup", "others"],
  modes: ["online", "offline"],
  moods: ["meetup", "community", "talk", "fest", "culture", "launch", "annual"],
  palettes: [
    { id: "slate-rain", name: "Slate Rain", bg: "#0C171E", bg2: "#2B4756", ink: "#F3EFE6", muted: "#A8BCC4", accent: "#F2C14E", accent2: "#6E9CA8" },
    { id: "petrichor", name: "Petrichor", bg: "#13211A", bg2: "#3C6149", ink: "#F4F1E4", muted: "#B9CBB5", accent: "#EC7B4C", accent2: "#8DB89A" },
    { id: "newsprint", name: "Newsprint", bg: "#ECE7DC", bg2: "#BCC8CB", ink: "#14181A", muted: "#4F585C", accent: "#C93A28", accent2: "#E9D9C2" },
  ],
  render,
};
