import { Art, Frame, Grain, Layer, Logos, Qr, Spacer, collabLine } from "../kit";
import type { PosterHouse, RenderCtx, Template } from "../types";
import { fitSize, truncate } from "../util";

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Lone Pichavaram logo gets a wordmark so it reads as a sign-off, not a leftover. */
function Houses({ houses, ring, ink, muted }: { houses: PosterHouse[]; ring: string; ink: string; muted: string }) {
  const logos = <Logos houses={houses} plate="#FFFDF8" ring={ring} max={66} gap={12} width={700} justify="flex-start" />;
  if (houses.length > 1) return logos;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {logos}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", fontFamily: "Unbounded", fontWeight: 800, fontSize: 24, color: ink }}>{houses[0].name.toUpperCase()}</div>
        <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: muted }}>HOST HOUSE · READY</div>
      </div>
    </div>
  );
}

// 4×4 ordered-dither thresholds: the sun is shaded the way 8-bit hardware had to.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

/** Pixel sun built from square blocks: banded palette, dithered only where bands meet, scanline gaps near the horizon. */
function pixelSun(cx: number, cy: number, r: number, horizon: number, B: number, top: string, bottom: string) {
  const levels = 5;
  const tones = Array.from({ length: levels }, (_, i) => mix(top, bottom, i / (levels - 1)));
  const y0 = cy - r;
  const rows = Math.ceil((horizon - y0) / B);
  const out: string[] = [];
  for (let j = 0; j < rows; j++) {
    const y = y0 + j * B;
    const fromBottom = rows - 1 - j;
    if (fromBottom < 12 && fromBottom % 3 === 1) continue;
    const v = ((j + 0.5) / rows) * (levels - 1);
    const base = Math.min(levels - 2, Math.floor(v));
    // only the outer 35% of each band is dithered, the rest stays flat
    const frac = Math.max(0, Math.min(1, (v - base - 0.65) / 0.35));
    const dy = y + B / 2 - cy;
    const half = Math.sqrt(Math.max(0, r * r - dy * dy));
    const n = Math.floor(half / B);
    for (let i = -n; i < n; i++) {
      const th = BAYER[(j % 4) * 4 + ((i % 4) + 4) % 4];
      out.push(`<rect x="${cx + i * B}" y="${y}" width="${B}" height="${B}" fill="${frac > th ? tones[base + 1] : tones[base]}"/>`);
    }
  }
  return out.join("");
}

/** Horizon line: lifted when the HUD panel grows (two logo rows, wrapped chips) so the panel never covers the sun. */
function horizon({ data }: RenderCtx) {
  const chips = data.highlights.slice(0, 4).map((h) => truncate(h, 20));
  const chipW = chips.reduce((w, h) => w + 62 + h.length * 15.5, 0) + 12 * Math.max(0, chips.length - 1);
  const extra = (data.houses.length > 6 ? 82 : 0) + (chipW > 880 ? 58 : 0);
  return 712 - Math.max(0, extra - 74);
}

function art(ctx: RenderCtx) {
  const { p, rng } = ctx;
  const H = horizon(ctx);
  const sunR = 204;
  const sx = 540;
  // stars: dim pixel dots anywhere; brighter pluses only beside the sun, clear of the title zone
  const clearOfText = (x: number, y: number) => !(y > 50 && y < 120 && (x < 520 || x > 860)) && !(y > 140 && y < H - 250 && x > 70 && x < 1010);
  const dots = Array.from({ length: 40 }, () => {
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 8; tries++) {
      x = Math.round(rng() * 1060);
      y = Math.round(rng() * (H - 160));
      if (clearOfText(x, y)) break;
      x = -10;
    }
    return `<rect x="${x}" y="${y}" width="3" height="3" fill="${p.ink}" fill-opacity="${(0.25 + rng() * 0.4).toFixed(2)}"/>`;
  }).join("");
  const stars = dots;
  // stepped pixel mountains
  const step = 24;
  let ridge = `M0 ${H}`;
  let hgt = 30;
  for (let x = 0; x <= 1080; x += step) {
    const toCentre = Math.abs(x + step / 2 - sx);
    // hills stop short of the sun so it sits cleanly on the horizon
    const cap = toCentre < sunR + 36 ? 0 : 150;
    hgt = Math.max(cap ? 12 : 0, Math.min(cap, hgt + (rng() < 0.5 ? -1 : 1) * step * (0.5 + rng())));
    ridge += ` V${Math.round(H - hgt)} H${x + step}`;
  }
  ridge += ` V${H} Z`;
  // perspective floor
  const floorH = 1350 - H;
  const hLines = Array.from({ length: 14 }, (_, i) => {
    const t = Math.pow((i + 1) / 14, 2.2);
    const y = H + t * floorH;
    return `<line x1="0" y1="${y.toFixed(1)}" x2="1080" y2="${y.toFixed(1)}"/>`;
  }).join("");
  const vLines = Array.from({ length: 23 }, (_, i) => {
    const xb = sx + (i - 11) * 150;
    return `<line x1="${sx + (i - 11) * 14}" y1="${H}" x2="${xb}" y2="1350"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg}"/><stop offset="0.48" stop-color="${p.bg}"/><stop offset="${(H / 1350).toFixed(3)}" stop-color="${p.bg2}"/><stop offset="${(H / 1350).toFixed(3)}" stop-color="${p.bg}"/><stop offset="1" stop-color="${p.bg}"/></linearGradient>
      <radialGradient id="halo"><stop offset="0.45" stop-color="${p.accent}" stop-opacity="0.35"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg2}" stop-opacity="0.9"/><stop offset="0.25" stop-color="${p.bg}" stop-opacity="0"/></linearGradient>
      <clipPath id="above"><rect width="1080" height="${H}"/></clipPath>
      <filter id="glow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter>
    </defs>
    <rect width="1080" height="1350" fill="url(#sky)"/>
    ${stars}
    <circle cx="${sx}" cy="${H - 20}" r="${sunR + 170}" fill="url(#halo)" clip-path="url(#above)"/>
    ${pixelSun(sx, H - 12, sunR, H, 12, p.accent2, p.accent)}
    <path d="${ridge}" fill="${p.bg}" fill-opacity="0.92"/>
    <path d="${ridge}" fill="none" stroke="${p.accent}" stroke-opacity="0.55" stroke-width="2"/>
    <g stroke="${p.accent}" stroke-width="6" stroke-opacity="0.35" filter="url(#glow)">${hLines}${vLines}</g>
    <g stroke="${p.accent}" stroke-width="2" stroke-opacity="0.9">${hLines}${vLines}</g>
    <rect y="${H}" width="1080" height="${floorH}" fill="url(#fade)"/>
    <rect y="${H - 2}" width="1080" height="4" fill="${p.accent}"/>
  </svg>`;
}

function PixLabel({ children, color, size = 18 }: { children: string; color: string; size?: number }) {
  return <div style={{ display: "flex", fontFamily: "Pixel", fontSize: size, lineHeight: 1.4, color }}>{children}</div>;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const title = truncate(data.title, 60).toUpperCase();
  const fit = { width: 920, max: 124, min: 52, k: 0.8 };
  const size = fitSize(title, { ...fit, maxLines: 3 });
  const threeLines = fitSize(title, { ...fit, maxLines: 2 }) < size;
  const tagline = truncate(data.tagline, 100).toUpperCase();
  const highlights = data.highlights.slice(0, 4).map((h) => truncate(h, 20).toUpperCase());
  const collab = collabLine(data.houses).replace(/×/g, "X").toUpperCase();
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={0.1} />
      <Layer style={{ padding: "60px 64px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PixLabel color={p.accent2}>1UP</PixLabel>
            <PixLabel color={p.ink}>{collab}</PixLabel>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <PixLabel color={p.accent2}>IIT MADRAS</PixLabel>
            <PixLabel color={p.ink}>BS DEGREE</PixLabel>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: threeLines ? 320 : 380, gap: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              textAlign: "center",
              fontFamily: "Unbounded",
              fontWeight: 800,
              fontSize: size,
              lineHeight: 1.04,
              letterSpacing: -1,
              color: p.ink,
              maxWidth: 940,
              textShadow: `0 ${Math.round(size / 18) + 2}px 0 ${p.accent}, 0 ${Math.round(size / 9) + 4}px 0 ${rgba(p.accent, 0.35)}`,
            }}
          >
            {title}
          </div>
          {tagline ? (
            <div style={{ display: "flex", justifyContent: "center", textAlign: "center", fontFamily: "Pixel", fontSize: 18, lineHeight: 1.5, color: p.accent2, maxWidth: 940, textWrap: "balance" }}>
              {`> ${tagline}_`}
            </div>
          ) : null}
        </div>
        <Spacer grow={1} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 22,
            padding: "28px 30px 28px",
            background: rgba(p.bg, 0.82),
            border: `3px solid ${p.accent}`,
            boxShadow: `8px 8px 0 ${rgba(p.accent, 0.35)}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20, flexShrink: 1 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <PixLabel color={p.accent2}>PRESS START</PixLabel>
                <div style={{ display: "flex", fontFamily: "Unbounded", fontWeight: 800, fontSize: 44, color: p.ink, lineHeight: 1.1 }}>
                  {`${when.weekday} ${when.day} ${when.month}`}
                </div>
                <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 25, color: p.muted }}>{when.timeRange}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <PixLabel color={p.accent2}>{data.mode === "online" ? "SERVER" : "ARENA"}</PixLabel>
                <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 29, color: p.ink }}>{truncate(ctx.where, 40)}</div>
                {ctx.linkLabel ? (
                  <div style={{ display: "flex", fontFamily: "Mono", fontSize: 20, color: p.muted }}>{truncate(ctx.linkLabel, 40)}</div>
                ) : null}
              </div>
            </div>
            <Qr ctx={ctx} ink={p.accent2} size={150} label="Scan to play" />
          </div>
          {highlights.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {highlights.map((h, i) => (
                <div
                  key={h}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 16px",
                    border: `2px solid ${i % 2 ? p.accent2 : p.accent}`,
                    background: rgba(i % 2 ? p.accent2 : p.accent, 0.12),
                  }}
                >
                  <div style={{ display: "flex", width: 8, height: 8, background: i % 2 ? p.accent2 : p.accent }} />
                  <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 21, letterSpacing: 2, color: p.ink }}>{h}</div>
                </div>
              ))}
            </div>
          ) : null}
          <div style={{ display: "flex", height: 0, borderTop: `2px dashed ${rgba(p.accent, 0.55)}` }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
            <Houses houses={data.houses} ring={p.accent2} ink={p.ink} muted={p.muted} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <PixLabel color={p.muted}>PLAYERS</PixLabel>
              <PixLabel color={p.ink} size={22}>{String(data.houses.length).padStart(2, "0")}</PixLabel>
            </div>
          </div>
        </div>
      </Layer>
    </Frame>
  );
}

export const arcadeGrid: Template = {
  id: "arcade-grid",
  name: "Arcade Grid",
  eventTypes: ["game-night"],
  modes: ["online"],
  moods: ["gaming", "quiz", "skribbl", "among us", "valorant", "bgmi", "tournament", "arcade", "retro", "pixel", "esports"],
  palettes: [
    { id: "outrun", name: "Outrun", bg: "#0B0221", bg2: "#46106B", ink: "#FFF6FD", muted: "#CDB6EA", accent: "#FF2E9A", accent2: "#FFD23F" },
    { id: "cabinet", name: "Teal Cabinet", bg: "#021418", bg2: "#0B5163", ink: "#EFFFFC", muted: "#9FD3CC", accent: "#22F0D4", accent2: "#FF8A3D" },
    { id: "cobalt", name: "Cobalt Arcade", bg: "#050A2E", bg2: "#1D3399", ink: "#F4F6FF", muted: "#AEB8EA", accent: "#4FA8FF", accent2: "#FF4D6A" },
  ],
  render,
};
