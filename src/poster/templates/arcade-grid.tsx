import { Art, Frame, Layer, Qr, Spacer, collabLine } from "../kit";
import type { PosterHouse, RenderCtx, Template } from "../types";
import { fitSize, truncate } from "../util";

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Turbulence on one small stitched tile, repeated: same look as kit Grain at a fraction of the cost.
const GRAIN = `<filter id="gn" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><pattern id="gt" width="240" height="240" patternUnits="userSpaceOnUse"><rect width="240" height="240" filter="url(#gn)"/></pattern>`;

/** Logo plates in explicit balanced rows (5+5, not 7+3). */
function LogoRows({ houses, plate, ring, max, width, gap = 12 }: { houses: PosterHouse[]; plate: string; ring: string; max: number; width: number; gap?: number }) {
  const n = houses.length;
  const perRow = n <= 6 ? n : Math.ceil(n / 2);
  const size = Math.max(50, Math.min(max, Math.floor((width - gap * (perRow - 1)) / perRow)));
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
              { }
              <img alt="" src={h.logo} width={size - 12} height={size - 12} style={{ objectFit: "contain" }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Original pixel sprites: '#' = main colour, '+' = second colour, '.' = empty.
const SPRITES = {
  critter: ["...####...", ".########.", "##+##+####", "##########", "#.######.#", "#.#....#.#", "...##.##.."],
  stick: ["...++...", "..++++..", "..++++..", "...++...", "...##...", "...##...", ".######.", "########", "########"],
  coin: [".####.", "##++##", "#+##+#", "#+##+#", "##++##", ".####."],
  heart: [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."],
};

function sprite(rows: string[], x: number, y: number, px: number, c1: string, c2: string) {
  return rows
    .flatMap((row, j) =>
      [...row].map((ch, i) =>
        ch === "." ? "" : `<rect x="${x + i * px}" y="${y + j * px}" width="${px}" height="${px}" fill="${ch === "#" ? c1 : c2}"/>`,
      ),
    )
    .join("");
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
  const sunR = 236;
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
  const pluses = Array.from({ length: 6 }, (_, i) => {
    const left = i % 2 === 0;
    const x = Math.round(left ? 30 + rng() * 240 : 800 + rng() * 240);
    const y = Math.round(H - 232 + rng() * 72);
    return `<path d="M${x + 4} ${y}h4v4h4v4h-4v4h-4v-4h-4v-4h4z" fill="${p.accent2}" fill-opacity="${(0.4 + rng() * 0.5).toFixed(2)}"/>`;
  }).join("");
  const stars = dots + pluses;
  // sun stripes get thicker towards the horizon
  const cuts = Array.from({ length: 7 }, (_, i) => {
    const y = H - 18 - i * 30;
    const h = 12 - i * 1.6;
    return `<rect x="0" y="${y.toFixed(1)}" width="1080" height="${Math.max(2, h).toFixed(1)}" fill="#000"/>`;
  }).join("");
  // stepped pixel mountains
  const step = 24;
  let ridge = `M0 ${H}`;
  let hgt = 30;
  for (let x = 0; x <= 1080; x += step) {
    const toCentre = Math.abs(x + step / 2 - sx);
    const cap = toCentre < sunR - 30 ? 50 : 150;
    hgt = Math.max(12, Math.min(cap, hgt + (rng() < 0.5 ? -1 : 1) * step * (0.5 + rng())));
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
  const slots = [
    { x: 60 + rng() * 40, y: H - 212 + rng() * 40 },
    { x: 905 + rng() * 40, y: H - 217 + rng() * 45 },
  ];
  const leftIsCritter = rng() < 0.5;
  const s1 = leftIsCritter ? SPRITES.critter : SPRITES.stick;
  const s2 = leftIsCritter ? SPRITES.stick : SPRITES.critter;
  const coins = [
    sprite(SPRITES.coin, Math.round(slots[0].x + 120 + rng() * 30), Math.round(slots[0].y + 10 + rng() * 30), 5, p.accent2, p.bg),
    sprite(SPRITES.heart, Math.round(slots[1].x - 80 - rng() * 20), Math.round(slots[1].y + 20 + rng() * 30), 5, p.accent, p.accent),
  ].join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg}"/><stop offset="0.48" stop-color="${p.bg}"/><stop offset="${(H / 1350).toFixed(3)}" stop-color="${p.bg2}"/><stop offset="${(H / 1350).toFixed(3)}" stop-color="${p.bg}"/><stop offset="1" stop-color="${p.bg}"/></linearGradient>
      <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0.05" stop-color="${p.accent2}"/><stop offset="0.95" stop-color="${p.accent}"/></linearGradient>
      <radialGradient id="halo"><stop offset="0.45" stop-color="${p.accent}" stop-opacity="0.35"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
      <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.bg2}" stop-opacity="0.9"/><stop offset="0.25" stop-color="${p.bg}" stop-opacity="0"/></linearGradient>
      <mask id="sunMask"><rect width="1080" height="1350" fill="#fff"/>${cuts}</mask>
      <clipPath id="above"><rect width="1080" height="${H}"/></clipPath>
      <filter id="glow" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="5"/></filter>
      ${GRAIN}
    </defs>
    <rect width="1080" height="1350" fill="url(#sky)"/>
    ${stars}
    <circle cx="${sx}" cy="${H - 20}" r="${sunR + 170}" fill="url(#halo)" clip-path="url(#above)"/>
    <g clip-path="url(#above)"><circle cx="${sx}" cy="${H - 20}" r="${sunR}" fill="url(#sun)" mask="url(#sunMask)"/></g>
    <path d="${ridge}" fill="${p.bg}" fill-opacity="0.92"/>
    <path d="${ridge}" fill="none" stroke="${p.accent}" stroke-opacity="0.55" stroke-width="2"/>
    <g stroke="${p.accent}" stroke-width="6" stroke-opacity="0.35" filter="url(#glow)">${hLines}${vLines}</g>
    <g stroke="${p.accent}" stroke-width="2" stroke-opacity="0.9">${hLines}${vLines}</g>
    <rect y="${H}" width="1080" height="${floorH}" fill="url(#fade)"/>
    <rect y="${H - 2}" width="1080" height="4" fill="${p.accent}"/>
    ${sprite(s1, Math.round(slots[0].x), Math.round(slots[0].y), 9, p.accent, p.accent2)}
    ${sprite(s2, Math.round(slots[1].x), Math.round(slots[1].y), 9, p.accent, p.accent2)}
    ${coins}
    <rect width="1080" height="1350" fill="url(#gt)" opacity="0.1"/>
  </svg>`;
}

function PixLabel({ children, color, size = 14 }: { children: string; color: string; size?: number }) {
  return <div style={{ display: "flex", fontFamily: "Pixel", fontSize: size, lineHeight: 1.4, color }}>{children}</div>;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const title = truncate(data.title, 60).toUpperCase();
  const fit = { width: 920, max: 124, min: 52, k: 0.8 };
  const size = fitSize(title, { ...fit, maxLines: 3 });
  const threeLines = fitSize(title, { ...fit, maxLines: 2 }) < size;
  const tagline = truncate(data.tagline, 46).toUpperCase();
  const highlights = data.highlights.slice(0, 4).map((h) => truncate(h, 20).toUpperCase());
  const collab = collabLine(data.houses).replace(/×/g, "X").toUpperCase();
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Layer style={{ padding: "60px 64px 60px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <PixLabel color={p.accent2}>1UP</PixLabel>
            <PixLabel color={p.ink}>{collab}</PixLabel>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <PixLabel color={p.accent2}>HI-SCORE</PixLabel>
            <PixLabel color={p.ink}>IITM BS</PixLabel>
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
          {tagline ? <PixLabel color={p.accent2} size={17}>{`> ${tagline}_`}</PixLabel> : null}
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
            <LogoRows houses={data.houses} plate="#FFFDF8" ring={p.accent2} max={66} width={700} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <PixLabel color={p.muted} size={12}>PLAYERS</PixLabel>
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
