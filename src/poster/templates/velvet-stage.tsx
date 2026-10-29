import { Art, Frame, Grain, Highlights, Layer, Logos, Qr, Spacer, collabLine } from "../kit";
import type { RenderCtx, Template } from "../types";
import { fitSize, truncate } from "../util";

function art({ p, rng }: RenderCtx) {
  const rings = Array.from({ length: 26 }, (_, i) => {
    const r = 140 + i * 11;
    return `<circle cx="880" cy="300" r="${r}" fill="none" stroke="${p.accent}" stroke-opacity="${(0.05 + (i % 3) * 0.04).toFixed(2)}" stroke-width="${i % 4 === 0 ? 2 : 1}"/>`;
  }).join("");
  const bars = Array.from({ length: 54 }, (_, i) => {
    const h = 20 + Math.abs(Math.sin(i * 0.55 + rng() * 2)) * 120 * (0.4 + rng() * 0.6);
    return `<rect x="${i * 20 + 6}" y="${1350 - h}" width="8" height="${h}" rx="4" fill="${p.accent}" fill-opacity="0.22"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <radialGradient id="g" cx="0.75" cy="0.2" r="0.95"><stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.bg}"/></radialGradient>
      <radialGradient id="l" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${p.accent2}"/><stop offset="1" stop-color="${p.accent2}" stop-opacity="0.6"/></radialGradient>
      <filter id="b"><feGaussianBlur stdDeviation="60"/></filter>
    </defs>
    <rect width="1080" height="1350" fill="url(#g)"/>
    <circle cx="880" cy="300" r="440" fill="#000" fill-opacity="0.35"/>
    ${rings}
    <circle cx="880" cy="300" r="118" fill="url(#l)"/>
    <circle cx="880" cy="300" r="14" fill="${p.bg}"/>
    <circle cx="180" cy="1180" r="260" fill="${p.accent2}" fill-opacity="0.18" filter="url(#b)"/>
    ${bars}
  </svg>`;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const title = truncate(data.title, 60);
  const size = fitSize(title, { width: 940, maxLines: 3, max: 150, min: 64, k: 0.56 });
  const tagline = truncate(data.tagline, 70);
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={0.14} />
      <Layer style={{ padding: "72px 70px 70px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 22, letterSpacing: 6, color: p.accent }}>
            {collabLine(data.houses).toUpperCase()}
          </div>
          <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 18, letterSpacing: 5, color: p.muted }}>
            IIT MADRAS · BS DEGREE
          </div>
        </div>
        <Spacer grow={1} />
        {tagline ? (
          <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontWeight: 600, fontSize: 52, color: p.muted, marginBottom: 6 }}>
            {tagline}
          </div>
        ) : null}
        <div style={{ display: "flex", fontFamily: "Playfair", fontWeight: 900, fontSize: size, lineHeight: 0.98, color: p.ink, letterSpacing: -2, maxWidth: 940 }}>
          {title}
        </div>
        <div style={{ display: "flex", width: 160, height: 3, background: p.accent, margin: "34px 0 30px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
          <div style={{ display: "flex", fontFamily: "Playfair", fontWeight: 700, fontSize: 130, color: p.accent, lineHeight: 1 }}>{when.day}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 34, letterSpacing: 6, color: p.ink }}>
              {`${when.month} ${when.year}`}
            </div>
            <div style={{ display: "flex", fontFamily: "Cormorant", fontWeight: 700, fontSize: 38, color: p.muted }}>{when.weekdayLong}</div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 26, color: p.ink }}>{when.timeRange}</div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 30 }}>
          <Highlights items={data.highlights} color={p.ink} dot={p.accent} />
        </div>
        <Spacer grow={1} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, flexShrink: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 20, letterSpacing: 5, color: p.accent }}>
                {data.mode === "online" ? "JOIN ON" : "VENUE"}
              </div>
              <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 32, color: p.ink }}>{truncate(ctx.where, 40)}</div>
              {ctx.linkLabel ? (
                <div style={{ display: "flex", fontFamily: "Mono", fontSize: 22, color: p.muted }}>{truncate(ctx.linkLabel, 44)}</div>
              ) : null}
            </div>
            <Logos houses={data.houses} plate="#FFFDF8" ring={p.accent} max={78} width={ctx.qr ? 700 : 940} justify="flex-start" />
          </div>
          <Qr ctx={ctx} ink={p.muted} size={140} />
        </div>
      </Layer>
    </Frame>
  );
}

export const velvetStage: Template = {
  id: "velvet-stage",
  name: "Velvet Stage",
  eventTypes: ["music-night", "others", "fun-night"],
  modes: ["online", "offline"],
  moods: ["music", "acoustic", "jam", "sing", "melody", "unplugged", "karaoke", "classical", "soulful"],
  palettes: [
    { id: "bordeaux", name: "Bordeaux", bg: "#14070C", bg2: "#4A0F24", ink: "#F7ECDF", muted: "#D2B3A8", accent: "#D9B26F", accent2: "#E0506B" },
    { id: "sapphire", name: "Midnight Sapphire", bg: "#060A18", bg2: "#17286A", ink: "#EEF1FF", muted: "#A9B4DA", accent: "#D2AE66", accent2: "#5E7BFF" },
    { id: "emerald", name: "Emerald Lounge", bg: "#03110D", bg2: "#0F4D3C", ink: "#F0F5EC", muted: "#A9C7B9", accent: "#E3C27B", accent2: "#2FBF8F" },
  ],
  render,
};
