import { Art, Frame, Layer, Qr, Spacer, collabLine } from "../kit";
import type { PosterHouse, RenderCtx, Template } from "../types";
import { fitSize, svgUri, truncate } from "../util";

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Turbulence on one small stitched tile, repeated: same look as kit Grain at a fraction of the cost.
const GRAIN = `<filter id="gn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><pattern id="gt" width="240" height="240" patternUnits="userSpaceOnUse"><rect width="240" height="240" filter="url(#gn)"/></pattern>`;

/** Logo plates in explicit balanced rows (5+5, not 7+3). */
function LogoRows({ houses, plate, ring, max, width, gap = 14 }: { houses: PosterHouse[]; plate: string; ring: string; max: number; width: number; gap?: number }) {
  const n = houses.length;
  const perRow = n <= 6 ? n : Math.ceil(n / 2);
  const size = Math.max(52, Math.min(max, Math.floor((width - gap * (perRow - 1)) / perRow)));
  const rows = [houses.slice(0, perRow), houses.slice(perRow)].filter((r) => r.length);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: "flex", gap }}>
          {row.map((h) => (
            <div
              key={h.name}
              style={{ display: "flex", width: size, height: size, borderRadius: size, background: plate, border: `2px solid ${ring}`, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" src={h.logo} width={size - 14} height={size - 14} style={{ objectFit: "contain" }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
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
  const cx = 790 + Math.round(rng() * 60);
  const cy = 330 + Math.round(rng() * 40);
  const r = 210;
  const b1 = { x: cx + 40 + rng() * 60, y: cy - 60 + rng() * 80 };
  const b2 = { x: 90 + rng() * 160, y: 760 + rng() * 160 };
  const b3 = { x: 860 + rng() * 120, y: 1160 + rng() * 80 };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <radialGradient id="g" cx="0.7" cy="0.25" r="1"><stop offset="0" stop-color="${p.bg2}"/><stop offset="0.7" stop-color="${p.bg}"/></radialGradient>
      <radialGradient id="ba"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.5"/><stop offset="0.45" stop-color="${p.accent}" stop-opacity="0.22"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="bb"><stop offset="0" stop-color="${p.accent2}" stop-opacity="0.36"/><stop offset="0.45" stop-color="${p.accent2}" stop-opacity="0.15"/><stop offset="1" stop-color="${p.accent2}" stop-opacity="0"/></radialGradient>
      ${GRAIN}
      <filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter>
      <pattern id="scan" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="1.4" fill="#FFFFFF" fill-opacity="0.035"/></pattern>
    </defs>
    <rect width="1080" height="1350" fill="url(#g)"/>
    <circle cx="${b1.x}" cy="${b1.y}" r="520" fill="url(#ba)"/>
    <circle cx="${b2.x}" cy="${b2.y}" r="500" fill="url(#bb)"/>
    <circle cx="${b3.x}" cy="${b3.y}" r="380" fill="url(#ba)" opacity="0.6"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.accent}" stroke-width="26" stroke-opacity="0.55" filter="url(#glow)"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.accent}" stroke-width="7"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#FFFFFF" stroke-opacity="0.75" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${r + 34}" fill="none" stroke="${p.accent2}" stroke-opacity="0.35" stroke-width="1.5" stroke-dasharray="2 10"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 26}" fill="none" stroke="${p.accent2}" stroke-opacity="0.4" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="${r - 26}" fill="url(#bb)" opacity="0.5"/>
    <rect width="1080" height="1350" fill="url(#scan)"/>
    <rect width="1080" height="1350" fill="url(#gt)" opacity="0.12"/>
  </svg>`;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const title = truncate(data.title, 60).toUpperCase();
  const width = 940;
  const k = 0.41;
  const size = fitSize(title, { width, maxLines: 3, max: 200, min: 96, k });
  const lines = fitSize(title, { width, maxLines: 1, max: size, min: size - 1, k }) >= size ? 1 : 2;
  const echoes = lines === 1 ? 2 : 1;
  const tagline = truncate(data.tagline, 60);
  const highlights = data.highlights.slice(0, 4).map((h) => truncate(h, 22));
  const lineBox = Math.round(size * 0.86);
  const titleStyle = {
    display: "flex",
    fontFamily: "Bebas",
    fontSize: size,
    lineHeight: 0.86,
    letterSpacing: 1,
    maxWidth: width,
  } as const;
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Layer style={{ padding: "66px 70px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 22, letterSpacing: 6, color: p.accent }}>
              {collabLine(data.houses).toUpperCase()}
            </div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 17, letterSpacing: 5, color: p.muted }}>
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
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 17, letterSpacing: 2, color: p.ink }}>LIVE · ONLINE</div>
          </div>
        </div>
        <Spacer grow={1} />
        {Array.from({ length: echoes }, (_, i) => (
          <div key={i} style={{ display: "flex", height: lineBox, overflow: "hidden", opacity: echoes === 2 && i === 0 ? 0.35 : 0.7 }}>
            <div style={{ ...titleStyle, color: "transparent", WebkitTextStroke: `2px ${i === echoes - 1 ? p.accent : p.accent2}` }}>{title}</div>
          </div>
        ))}
        <div style={{ ...titleStyle, color: p.ink, textShadow: `0 0 34px ${rgba(p.accent, 0.75)}` }}>{title}</div>
        {tagline ? (
          <div style={{ display: "flex", fontFamily: "Syne", fontWeight: 600, fontSize: 34, color: p.accent2, marginTop: 18 }}>{tagline}</div>
        ) : null}
        <div style={{ display: "flex", margin: "26px 0 22px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={svgUri(equaliser(ctx, 940, 64))} width={940} height={64} />
        </div>
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
              <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 32, color: p.ink }}>{truncate(ctx.where, 40)}</div>
              {ctx.linkLabel ? (
                <div style={{ display: "flex", fontFamily: "Mono", fontSize: 21, color: p.muted }}>{truncate(ctx.linkLabel, 44)}</div>
              ) : null}
            </div>
            <LogoRows houses={data.houses} plate="#FFFDF8" ring={p.accent} max={74} width={ctx.qr ? 640 : 940} />
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
