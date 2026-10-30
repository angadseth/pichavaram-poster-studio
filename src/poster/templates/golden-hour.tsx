import { Art, Frame, Grain, Highlights, Layer, Logos, Qr, Spacer, collabLine } from "../kit";
import type { RenderCtx, Template } from "../types";
import { fitSize, svgUri, truncate } from "../util";

/** Per-palette paper colours for the tear-off calendar (always a light sheet). */
const PAPER: Record<string, { sheet: string; ink: string; soft: string; band: string; bandInk: string }> = {
  sandstone: { sheet: "#FFFAF1", ink: "#2A1A12", soft: "#8A6450", band: "#C4552B", bandInk: "#FFF4E6" },
  terracotta: { sheet: "#FFF6E8", ink: "#3A1A0E", soft: "#9A5A3E", band: "#3A1A0E", bandInk: "#FFD9A0" },
  dusk: { sheet: "#FBEFDF", ink: "#2A1622", soft: "#8C5A5A", band: "#E8A65A", bandInk: "#2A1622" },
};

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** A hand-drawn line: straight segment broken into jittered quadratic curves. */
function wobble(rng: () => number, x1: number, y1: number, x2: number, y2: number, j = 4, steps = 4) {
  let d = `M${x1.toFixed(1)} ${y1.toFixed(1)}`;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const cx = x1 + (x2 - x1) * (t - 0.5 / steps) + (rng() - 0.5) * j * 2;
    const cy = y1 + (y2 - y1) * (t - 0.5 / steps) + (rng() - 0.5) * j * 2;
    d += ` Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

function art({ p, rng }: RenderCtx) {
  // a sun setting into the dunes, bottom right
  const cx = 860 + rng() * 50;
  const cy = 1270;
  const halo = Array.from({ length: 7 }, (_, i) => {
    const r = 290 + i * 38;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.accent}" stroke-opacity="${(0.18 - i * 0.02).toFixed(3)}" stroke-width="${i === 0 ? 2 : 1.2}" stroke-dasharray="${i % 2 ? "2 9" : "none"}"/>`;
  }).join("");
  // slits widen toward the horizon
  const slits = Array.from({ length: 6 }, (_, i) => {
    const y = cy - 150 + i * 26;
    const h = 3 + i * 2.4;
    return `<rect x="0" y="${y}" width="1080" height="${h.toFixed(1)}" fill="#000"/>`;
  }).join("");
  const dunes = Array.from({ length: 4 }, (_, i) => {
    const y = 1268 + i * 18;
    const a = 8 + rng() * 10;
    return `<path d="M-20 ${y} C 220 ${y - a} 420 ${y + a} 640 ${y - a * 0.6} S 980 ${y + a * 0.8} 1100 ${y - a * 0.4}" fill="none" stroke="${p.ink}" stroke-opacity="${(0.1 + i * 0.03).toFixed(3)}" stroke-width="1.4"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${p.bg}"/><stop offset="1" stop-color="${p.bg2}"/></linearGradient>
      <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.accent2}"/><stop offset="0.8" stop-color="${p.accent}"/></linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${p.accent2}" stop-opacity="0.4"/><stop offset="1" stop-color="${p.accent2}" stop-opacity="0"/></radialGradient>
      <mask id="cut"><rect width="1080" height="1350" fill="#fff"/>${slits}<rect x="0" y="${cy}" width="1080" height="200" fill="#000"/></mask>
    </defs>
    <rect width="1080" height="1350" fill="url(#bg)"/>
    <circle cx="${cx}" cy="${cy}" r="620" fill="url(#glow)"/>
    ${halo}
    <circle cx="${cx}" cy="${cy}" r="250" fill="url(#sun)" mask="url(#cut)"/>
    ${dunes}
    <rect x="26" y="26" width="1028" height="1298" fill="none" stroke="${p.ink}" stroke-opacity="0.22" stroke-width="1.5"/>
  </svg>`;
}

/** Sketchy street map with a dashed route ending at a pin; sized to the venue card. */
function mapArt({ p, rng }: RenderCtx, w: number, h: number, sheet: string) {
  const ink = p.ink;
  const streets: string[] = [];
  for (let i = 0; i < 4; i++) {
    const y = 30 + i * (h / 4) + rng() * 20;
    streets.push(`<path d="${wobble(rng, -10, y, w + 10, y + (rng() - 0.5) * 40)}" stroke-width="${i === 1 ? 7 : 2.2}"/>`);
  }
  for (let i = 0; i < 6; i++) {
    const x = 40 + i * (w / 6) + rng() * 30;
    streets.push(`<path d="${wobble(rng, x, -10, x + (rng() - 0.5) * 60, h + 10)}" stroke-width="${i === 4 ? 6 : 2}"/>`);
  }
  streets.push(`<path d="${wobble(rng, w * 0.3, h + 10, w + 10, h * 0.05, 6, 6)}" stroke-width="4"/>`);
  const px = w - 150 - rng() * 30;
  const py = h * 0.42 + rng() * 20;
  const river = `<path d="M${w * 0.45} ${h + 20} C ${w * 0.55} ${h * 0.7} ${w * 0.4} ${h * 0.35} ${w * 0.62} ${h * 0.1} S ${w * 0.9} -20 ${w + 20} ${h * 0.05}" fill="none" stroke="${p.accent2}" stroke-opacity="0.28" stroke-width="18" stroke-linecap="round"/>`;
  const park = `<ellipse cx="${px - 90}" cy="${py + 80}" rx="46" ry="30" fill="${p.accent2}" fill-opacity="0.14" stroke="${ink}" stroke-opacity="0.25" stroke-dasharray="3 5"/>`;
  const route = `<path d="M${w * 0.5} ${h + 10} C ${w * 0.56} ${h * 0.75} ${px - 110} ${py + 40} ${px} ${py + 46}" fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round" stroke-dasharray="1 11"/>`;
  const pin = `<g transform="translate(${px} ${py})">
      <ellipse cx="0" cy="48" rx="22" ry="6" fill="${ink}" fill-opacity="0.18"/>
      <path d="M0 48 C -8 30 -30 14 -30 -8 A 30 30 0 1 1 30 -8 C 30 14 8 30 0 48 Z" fill="${p.accent}" stroke="${ink}" stroke-opacity="0.35" stroke-width="1.5"/>
      <circle cx="0" cy="-8" r="11" fill="${sheet}"/>
    </g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${sheet}" stop-opacity="0.9"/><stop offset="0.5" stop-color="${sheet}" stop-opacity="0.55"/><stop offset="0.75" stop-color="${sheet}" stop-opacity="0"/></linearGradient></defs>
    ${river}
    <g fill="none" stroke="${ink}" stroke-opacity="0.2" stroke-linecap="round">${streets.join("")}</g>
    ${park}
    <rect width="${w}" height="${h}" fill="url(#fade)"/>
    ${route}
    ${pin}
  </svg>`;
}

function pinIcon(color: string) {
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="28" viewBox="-15 -24 30 42"><path d="M0 17 C -4 9 -14 2 -14 -9 A 14 14 0 1 1 14 -9 C 14 2 4 9 0 17 Z" fill="${color}"/><circle cx="0" cy="-9" r="5" fill="#fff"/></svg>`,
  );
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const paper = PAPER[p.id] ?? PAPER.sandstone;
  const light = p.id === "sandstone";
  const title = truncate(data.title, 60);
  const size = fitSize(title, { width: 930, maxLines: 3, max: 156, min: 64, k: 0.56 });
  const words = title.split(" ");
  const last = words.length > 1 ? words.pop() : undefined;
  const tagline = truncate(data.tagline, 64);
  // keep short numbers glued to the word before them ("Sector 1" never splits)
  const venue = ctx.where.trim().replace(/\s+/g, " ").replace(/ (\d{1,4})\b/g, " $1");
  const vSize = fitSize(venue, { width: 380, maxLines: 3, max: 36, min: 24, k: 0.56 });
  const cardW = 940 - 230 - 26;
  const cardH = 310;
  const region = data.region?.trim();
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={light ? 0.1 : 0.14} />
      <Layer style={{ padding: "70px 70px 62px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 20, letterSpacing: 5, color: p.accent }}>
              {collabLine(data.houses).toUpperCase()}
            </div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 18, letterSpacing: 4, color: p.muted }}>IIT MADRAS · BS DEGREE</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 20px 10px",
              borderRadius: 999,
              border: `1.5px solid ${rgba(p.ink, 0.35)}`,
              background: rgba(paper.sheet, light ? 0.55 : 0.08),
              fontFamily: "Cormorant",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: 28,
              color: p.ink,
            }}
          >
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 10, background: p.accent }} />
            {truncate(region || "In person", 28)}
          </div>
        </div>
        <Spacer grow={1} />
        {tagline ? (
          <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontWeight: 600, fontSize: 46, color: p.muted, marginBottom: 10, maxWidth: 900, wordBreak: "break-word" }}>
            {tagline}
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", columnGap: size * 0.24, rowGap: 0, maxWidth: 940, lineHeight: 1.0 }}>
          {words.map((w, i) => (
            <div key={i} style={{ display: "flex", fontFamily: "Playfair", fontWeight: 900, fontSize: size, color: p.ink, letterSpacing: -2, maxWidth: 940, wordBreak: "break-word" }}>
              {w}
            </div>
          ))}
          {last ? (
            <div style={{ display: "flex", fontFamily: "Playfair", fontStyle: "italic", fontWeight: 700, fontSize: size, color: p.accent, letterSpacing: -1, maxWidth: 940, wordBreak: "break-word" }}>
              {last}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "30px 0 30px" }}>
          <div style={{ display: "flex", width: 120, height: 2, background: p.accent }} />
          <div style={{ display: "flex", width: 8, height: 8, borderRadius: 8, background: p.accent }} />
        </div>
        <div style={{ display: "flex", gap: 26, height: cardH }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: 230,
              borderRadius: 20,
              overflow: "hidden",
              background: paper.sheet,
              boxShadow: `0 18px 40px ${rgba("#2A1A12", light ? 0.16 : 0.35)}`,
            }}
          >
            <div
              style={{
                display: "flex",
                width: "100%",
                height: 66,
                alignItems: "center",
                justifyContent: "center",
                background: paper.band,
                fontFamily: "Grotesk",
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: 6,
                color: paper.bandInk,
              }}
            >
              {`${when.month} ${when.year}`}
            </div>
            <div style={{ display: "flex", fontFamily: "Playfair", fontWeight: 900, fontSize: 132, lineHeight: 1, color: paper.ink, marginTop: 14 }}>{when.day}</div>
            <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontWeight: 600, fontSize: 36, color: paper.soft, marginTop: 2 }}>
              {when.weekdayLong}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              position: "relative",
              width: cardW,
              height: cardH,
              borderRadius: 20,
              overflow: "hidden",
              background: light ? rgba(paper.sheet, 0.7) : rgba(paper.sheet, 0.07),
              border: `1.5px solid ${rgba(p.ink, light ? 0.16 : 0.22)}`,
            }}
          >
            { }
            <img
              alt=""
              src={svgUri(mapArt(ctx, cardW, cardH, light ? paper.sheet : p.bg))}
              width={cardW}
              height={cardH}
              style={{ position: "absolute", left: 0, top: 0 }}
            />
            <div style={{ display: "flex", flexDirection: "column", position: "relative", padding: "26px 30px 24px", width: 440, height: cardH - 50 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                { }
                <img alt="" src={pinIcon(p.accent)} width={18} height={25} />
                <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 5, color: p.accent }}>
                  {data.mode === "online" ? "JOIN ON" : "MEET US AT"}
                </div>
              </div>
              <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: vSize, lineHeight: 1.18, color: p.ink, marginTop: 12, maxWidth: 380, wordBreak: "break-word", textWrap: "balance" }}>
                {venue}
              </div>
              {ctx.linkLabel ? (
                <div style={{ display: "flex", fontFamily: "Mono", fontSize: 20, color: p.muted, marginTop: 6 }}>{truncate(ctx.linkLabel, 36)}</div>
              ) : null}
              <Spacer />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 4, color: p.muted }}>FROM</div>
                <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 28, color: p.ink }}>{when.timeRange}</div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 32 }}>
          <Highlights items={data.highlights} color={p.ink} dot={p.accent} font="Grotesk" size={23} />
        </div>
        <Spacer grow={1} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30, marginTop: 24 }}>
          {data.houses.length === 1 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <Logos houses={data.houses} plate={paper.sheet} ring={p.accent} max={92} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 4, color: p.accent }}>HOSTED BY</div>
                <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontWeight: 700, fontSize: 36, color: p.ink }}>{data.houses[0].name}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexShrink: 0 }}>
              <Logos houses={data.houses} plate={paper.sheet} ring={p.accent} max={76} gap={16} width={ctx.qr ? 640 : 700} justify="flex-start" />
            </div>
          )}
          {ctx.qr ? (
            <Qr ctx={ctx} ink={p.muted} size={128} />
          ) : (
            <div
              style={{
                display: "flex",
                padding: "4px 22px 8px",
                borderRadius: 999,
                background: paper.sheet,
                boxShadow: `0 10px 24px ${rgba("#2A1A12", 0.22)}`,
                fontFamily: "Caveat",
                fontWeight: 700,
                fontSize: 42,
                color: paper.ink,
                transform: "rotate(-5deg)",
                position: "absolute",
                right: 70,
                bottom: 150,
              }}
            >
              see you there!
            </div>
          )}
        </div>
      </Layer>
    </Frame>
  );
}

export const goldenHour: Template = {
  id: "golden-hour",
  name: "Golden Hour",
  eventTypes: ["meetup"],
  modes: ["offline"],
  moods: ["meetup", "coffee", "hangout", "picnic", "walk", "cafe", "reunion"],
  palettes: [
    { id: "sandstone", name: "Sandstone", bg: "#F5EBDC", bg2: "#EAD5BA", ink: "#2A1A12", muted: "#7A5A47", accent: "#C4552B", accent2: "#EBA545" },
    { id: "terracotta", name: "Terracotta", bg: "#9E3F25", bg2: "#C2603A", ink: "#FFF3E2", muted: "#F4CDB0", accent: "#FFD08A", accent2: "#F7B25E" },
    { id: "dusk", name: "Amber Dusk", bg: "#1E1626", bg2: "#47263A", ink: "#F8EBDD", muted: "#CFB4A6", accent: "#E8A65A", accent2: "#E2684A" },
  ],
  render,
};
