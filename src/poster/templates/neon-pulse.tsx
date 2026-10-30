import { Art, Frame, Grain, Layer, Logos, Qr, Spacer, collabLine } from "../kit";
import type { PosterHouse, RenderCtx, Template } from "../types";
import { fitSize, svgUri, truncate } from "../util";

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Lone Pichavaram logo gets a wordmark so it reads as a sign-off, not a leftover. */
function Houses({ houses, ring, ink, muted, max, width }: { houses: PosterHouse[]; ring: string; ink: string; muted: string; max: number; width: number }) {
  const logos = <Logos houses={houses} plate="#FFFDF8" ring={ring} max={max} gap={14} width={width} justify="flex-start" />;
  if (houses.length > 1) return logos;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {logos}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 26, color: ink }}>{houses[0].name}</div>
        <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 18, letterSpacing: 3, color: muted }}>IIT MADRAS · BS DEGREE</div>
      </div>
    </div>
  );
}

/** Glowing neon ring, drawn as its own image so it can sit in flow behind the echo line only. */
function ringSvg({ p }: RenderCtx, d: number) {
  const pad = 34;
  const c = d / 2 + pad;
  const r = d / 2 - 6;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${d + pad * 2}" height="${d + pad * 2}">
    <defs>
      <radialGradient id="in"><stop offset="0" stop-color="${p.accent2}" stop-opacity="0.18"/><stop offset="1" stop-color="${p.accent2}" stop-opacity="0"/></radialGradient>
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12"/></filter>
    </defs>
    <circle cx="${c}" cy="${c}" r="${r - 22}" fill="url(#in)"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${p.accent}" stroke-width="24" stroke-opacity="0.5" filter="url(#glow)"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${p.accent}" stroke-width="7"/>
    <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="2"/>
    <circle cx="${c}" cy="${c}" r="${r - 22}" fill="none" stroke="${p.accent2}" stroke-opacity="0.45" stroke-width="1.5"/>
    <circle cx="${c}" cy="${c}" r="${r + 22}" fill="none" stroke="${p.accent2}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="2 10"/>
  </svg>`;
}

/** Mirrored equaliser strip, used in flow as the divider under the title. */
function equaliser({ p, rng }: RenderCtx, w: number, h: number) {
  const n = 64;
  const step = w / n;
  const bars = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const env = 0.25 + 0.75 * Math.pow(Math.sin(t * Math.PI), 0.6) * (0.35 + 0.65 * Math.abs(Math.sin(i * 0.7 + rng() * 3)));
    const bh = Math.max(4, Math.round(env * (h - 8)));
    return `<rect x="${(i * step + step / 2 - 2.5).toFixed(1)}" y="${(h - bh) / 2}" width="5" height="${bh}" rx="2.5" fill="url(#hz)"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <linearGradient id="hz" x1="0" y1="0" x2="${w}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${p.accent}"/><stop offset="1" stop-color="${p.accent2}"/></linearGradient>
      <filter id="s" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <rect x="0" y="${h / 2 - 0.75}" width="${w}" height="1.5" fill="url(#hz)" opacity="0.5"/>
    <g filter="url(#s)" opacity="0.8">${bars}</g>${bars}
  </svg>`;
}

function art({ p, rng }: RenderCtx) {
  const b1 = { x: 830 + rng() * 120, y: 260 + rng() * 120 };
  const b2 = { x: 90 + rng() * 160, y: 760 + rng() * 160 };
  const b3 = { x: 860 + rng() * 120, y: 1160 + rng() * 80 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <radialGradient id="g" cx="0.7" cy="0.25" r="1"><stop offset="0" stop-color="${p.bg2}"/><stop offset="0.7" stop-color="${p.bg}"/></radialGradient>
      <radialGradient id="ba"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.5"/><stop offset="0.45" stop-color="${p.accent}" stop-opacity="0.22"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="bb"><stop offset="0" stop-color="${p.accent2}" stop-opacity="0.36"/><stop offset="0.45" stop-color="${p.accent2}" stop-opacity="0.15"/><stop offset="1" stop-color="${p.accent2}" stop-opacity="0"/></radialGradient>
      <pattern id="scan" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="1.4" fill="#FFFFFF" fill-opacity="0.035"/></pattern>
    </defs>
    <rect width="1080" height="1350" fill="url(#g)"/>
    <circle cx="${b1.x}" cy="${b1.y}" r="520" fill="url(#ba)"/>
    <circle cx="${b2.x}" cy="${b2.y}" r="500" fill="url(#bb)"/>
    <circle cx="${b3.x}" cy="${b3.y}" r="380" fill="url(#ba)" opacity="0.6"/>
    <rect width="1080" height="1350" fill="url(#scan)"/>
  </svg>`;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const title = truncate(data.title, 60).toUpperCase();
  const width = 940;
  const k = 0.41;
  const size = fitSize(title, { width, maxLines: 3, max: 200, min: 96, k });
  const lines = [1, 2, 3].find((m) => fitSize(title, { width, maxLines: m, max: size, min: size - 1, k }) >= size) ?? 3;
  const echo = lines <= 2;
  const tagline = truncate(data.tagline, 100);
  const highlights = data.highlights.slice(0, 4).map((h) => truncate(h, 24));
  const lineBox = Math.round(size * 0.86);
  // rough height budget, to size the ring into the free space above the title
  const tagLines = tagline ? Math.ceil((tagline.length * 34 * 0.56) / 940) : 0;
  const n = data.houses.length;
  const perRow = n <= 6 ? n : Math.ceil(n / 2);
  const logoSize = Math.max(54, Math.min(74, Math.floor((640 - 14 * (perRow - 1)) / perRow)));
  const logosH = n > perRow ? logoSize * 2 + 14 : logoSize;
  const used =
    60 + (echo ? lineBox : 0) + lines * lineBox + (tagline ? 18 + tagLines * 42 : 0) + 112 +
    Math.max(150, highlights.length * 44) + Math.max(226, 23 + 48 + 30 + 28 + logosH);
  const freeTop = Math.max(0, (1350 - 130 - used) * 0.75);
  const ringD = Math.min(430, Math.round((echo ? lineBox : 0) + freeTop - 24));
  const titleStyle = {
    display: "flex",
    fontFamily: "Bebas",
    fontSize: size,
    lineHeight: 0.86,
    letterSpacing: 1,
    maxWidth: width,
    textWrap: "balance",
  } as const;
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={0.12} />
      <Layer style={{ padding: "66px 70px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 22, letterSpacing: 6, color: p.accent }}>
              {collabLine(data.houses).toUpperCase()}
            </div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 18, letterSpacing: 5, color: p.muted }}>
              IIT MADRAS · BS DEGREE
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 18px",
              borderRadius: 999,
              border: `1.5px solid ${p.accent2}`,
              background: rgba(p.bg, 0.6),
            }}
          >
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 10, background: p.accent2, boxShadow: `0 0 10px ${p.accent2}` }} />
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18, letterSpacing: 2, color: p.ink }}>LIVE · ONLINE</div>
          </div>
        </div>
        <Spacer grow={ringD >= 140 ? 3 : 1} />
        {ringD >= 140 ? (
          <div style={{ display: "flex", position: "relative", height: 0 }}>
            {/* sits on top of the solid title, behind the echo line */}
            <img
              alt=""
              src={svgUri(ringSvg(ctx, ringD))}
              width={ringD + 68}
              height={ringD + 68}
              style={{ position: "absolute", right: -58 + Math.round(ctx.rng() * 40), bottom: -((echo ? lineBox : 0) + 18) }}
            />
          </div>
        ) : null}
        {echo ? (
          <div style={{ display: "flex", height: lineBox, overflow: "hidden", opacity: 0.6 }}>
            <div style={{ ...titleStyle, color: "transparent", WebkitTextStroke: `2px ${p.accent}` }}>{title}</div>
          </div>
        ) : null}
        <div style={{ ...titleStyle, color: p.ink, textShadow: `0 0 34px ${rgba(p.accent, 0.75)}` }}>{title}</div>
        {tagline ? (
          <div style={{ display: "flex", fontFamily: "Syne", fontWeight: 600, fontSize: 34, lineHeight: 1.2, color: p.accent2, marginTop: 18, maxWidth: 940, textWrap: "balance" }}>
            {tagline}
          </div>
        ) : null}
        <div style={{ display: "flex", margin: "26px 0 22px" }}>
          { }
          <img alt="" src={svgUri(equaliser(ctx, 940, 64))} width={940} height={64} />
        </div>
        {ringD >= 140 ? null : <Spacer grow={1} />}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 30 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <div
              style={{
                display: "flex",
                fontFamily: "Anton",
                fontSize: 150,
                lineHeight: 1,
                color: "transparent",
                backgroundImage: `linear-gradient(180deg, ${p.ink} 10%, ${p.accent})`,
                backgroundClip: "text",
              }}
            >
              {when.day}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", fontFamily: "Bebas", fontSize: 50, letterSpacing: 4, color: p.ink, lineHeight: 1 }}>
                {`${when.month} ${when.year}`}
              </div>
              <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 22, letterSpacing: 6, color: p.accent }}>
                {when.weekdayLong.toUpperCase()}
              </div>
              <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 25, color: p.ink }}>{when.timeRange}</div>
            </div>
          </div>
          {highlights.length ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {highlights.map((h, i) => (
                <div key={h} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", fontFamily: "Bebas", fontSize: 36, letterSpacing: 2, color: p.ink, lineHeight: 1.05 }}>
                    {h.toUpperCase()}
                  </div>
                  <div style={{ display: "flex", width: 12, height: 12, transform: "rotate(45deg)", background: i % 2 ? p.accent2 : p.accent }} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <Spacer grow={1} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flexShrink: 1 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 19, letterSpacing: 5, color: p.accent2 }}>
                {data.mode === "online" ? "JOIN THE PARTY ON" : "VENUE"}
              </div>
              <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 32, color: p.ink }}>{truncate(ctx.where, 80)}</div>
              {ctx.linkLabel ? (
                <div style={{ display: "flex", fontFamily: "Mono", fontSize: 21, color: p.muted }}>{truncate(ctx.linkLabel, 44)}</div>
              ) : null}
            </div>
            <Houses houses={data.houses} ring={p.accent} ink={p.ink} muted={p.muted} max={74} width={ctx.qr ? 640 : 940} />
          </div>
          {ctx.qr ? (
            <div style={{ display: "flex", borderRadius: 24, padding: 4, background: p.accent, boxShadow: `0 0 30px ${rgba(p.accent, 0.7)}` }}>
              <div style={{ display: "flex", borderRadius: 20, background: p.bg, padding: "12px 12px 10px" }}>
                <Qr ctx={ctx} ink={p.ink} size={136} label="Scan · Join" />
              </div>
            </div>
          ) : null}
        </div>
      </Layer>
    </Frame>
  );
}

export const neonPulse: Template = {
  id: "neon-pulse",
  name: "Neon Pulse",
  eventTypes: ["music-night", "fun-night"],
  modes: ["online"],
  moods: ["dj", "party", "edm", "dance", "bollywood", "retro", "club", "rave", "beats", "remix"],
  palettes: [
    { id: "ultraviolet", name: "Ultraviolet", bg: "#07040F", bg2: "#22093F", ink: "#FBF6FF", muted: "#BBA9DC", accent: "#FF2BD6", accent2: "#2DE2FF" },
    { id: "acid", name: "Acid Rave", bg: "#040905", bg2: "#0F2C17", ink: "#F3FFEF", muted: "#A9C8AE", accent: "#B8FF2C", accent2: "#FF7A2F" },
    { id: "infrared", name: "Infrared", bg: "#0D0305", bg2: "#3E0913", ink: "#FFF4EE", muted: "#E2B4A8", accent: "#FF3348", accent2: "#FFB72B" },
  ],
  render,
};
