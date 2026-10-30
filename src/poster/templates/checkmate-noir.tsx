import { Art, Frame, Layer, Qr, Spacer, collabLine } from "../kit";
import type { PosterHouse, RenderCtx, Template } from "../types";
import { EVENT_LABELS } from "../types";
import { fitSize, truncate } from "../util";

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
              style={{ display: "flex", width: size, height: size, borderRadius: size, background: plate, border: `1.5px solid ${ring}`, alignItems: "center", justifyContent: "center", overflow: "hidden" }}
            >
              { }
              <img alt="" src={h.logo} width={size - 10} height={size - 10} style={{ objectFit: "contain" }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const N = 6; // board is a 6×6 crop of a chessboard
const BOARD_TOP = 190;
const BOARD_RIGHT = 1010;

function boardSquare(ctx: RenderCtx) {
  return ctx.data.title.length > 34 || ctx.data.houses.length > 6 ? 64 : 74;
}

/** Pawn silhouette drawn in a 100×100 box. */
const PAWN = `<circle cx="50" cy="27" r="13"/><rect x="35" y="40" width="30" height="7" rx="3.5"/><path d="M41 47 C43 60 37 69 31 76 L69 76 C63 69 57 60 59 47 Z"/><rect x="25" y="76" width="50" height="11" rx="3"/>`;

function art(ctx: RenderCtx, S: number) {
  const { p, rng } = ctx;
  const W = S * N;
  const bx = BOARD_RIGHT - W;
  const by = BOARD_TOP;
  const squares: string[] = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++)
      if ((r + c) % 2 === 1) squares.push(`<rect x="${bx + c * S}" y="${by + r * S}" width="${S}" height="${S}" fill="${p.ink}"/>`);
  // a knight-shaped move: pawn square → target square, always inside the board
  const pc = 1 + Math.floor(rng() * 3);
  const pr = 3 + Math.floor(rng() * 2);
  const tc = pc + (rng() < 0.5 ? 1 : 2);
  const tr = pr - (tc - pc === 1 ? 2 : 1);
  const centre = (c: number, r: number) => [bx + c * S + S / 2, by + r * S + S / 2];
  const [px, py] = centre(pc, pr);
  const [tx, ty] = centre(tc, tr);
  const pawnDark = (pc + pr) % 2 === 1;
  const ring = `<rect x="${bx + tc * S + 5}" y="${by + tr * S + 5}" width="${S - 10}" height="${S - 10}" fill="${p.accent}"/>`;
  const path = `<path d="M${px} ${py - S * 0.3} V${ty} H${tx - S * 0.32}" fill="none" stroke="${p.accent}" stroke-width="3" stroke-dasharray="2 7" stroke-linecap="round"/>`;
  const pawn = `<g transform="translate(${bx + pc * S} ${by + pr * S}) scale(${S / 100})" fill="${p.accent}" stroke="${pawnDark ? p.accent : p.ink}" stroke-width="2">${PAWN}</g>`;
  // hatched offset shadow behind the board
  const off = 16;
  const veil = 0.04 + rng() * 0.03;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="1.6" height="9" fill="${p.ink}" fill-opacity="0.55"/></pattern>
      <radialGradient id="v" cx="0.5" cy="0.4" r="0.8"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${veil.toFixed(3)}"/></radialGradient>
      ${GRAIN}
    </defs>
    <rect width="1080" height="1350" fill="${p.bg}"/>
    <rect x="${bx + off}" y="${by + off}" width="${W}" height="${W}" fill="url(#hatch)"/>
    <rect x="${bx}" y="${by}" width="${W}" height="${W}" fill="${p.bg2}"/>
    ${squares.join("")}
    ${ring}
    ${path}
    ${pawn}
    <rect x="${bx}" y="${by}" width="${W}" height="${W}" fill="none" stroke="${p.ink}" stroke-width="3"/>
    <rect x="${bx - 9}" y="${by - 9}" width="${W + 18}" height="${W + 18}" fill="none" stroke="${p.ink}" stroke-width="1"/>
    <rect width="1080" height="1350" fill="url(#v)"/>
    <rect width="1080" height="1350" fill="url(#gt)" opacity="0.13"/>
  </svg>`;
}

function Label({ children, color, size = 16 }: { children: string; color: string; size?: number }) {
  return <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: size, letterSpacing: 5, color }}>{children}</div>;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const S = boardSquare(ctx);
  const W = S * N;
  const compact = S < 74;
  const title = truncate(data.title, 60);
  const size = fitSize(title, { width: 940, maxLines: 3, max: 150, min: 60, k: 0.5 });
  const tagline = truncate(data.tagline, 64);
  const highlights = data.highlights.slice(0, 4).map((h) => truncate(h, 22));
  const files = "abcdef".split("");
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx, S)} />
      {/* board coordinates, set like a diagram caption */}
      <Layer>
        {files.map((f, i) => (
          <div
            key={f}
            style={{ position: "absolute", left: BOARD_RIGHT - W + i * S, top: BOARD_TOP + W + 14, width: S, display: "flex", justifyContent: "center", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 18, color: p.muted }}
          >
            {f}
          </div>
        ))}
        {files.map((_, i) => (
          <div
            key={i}
            style={{ position: "absolute", left: BOARD_RIGHT - W - 34, top: BOARD_TOP + i * S + S / 2 - 12, display: "flex", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 18, color: p.muted }}
          >
            {String(N - i)}
          </div>
        ))}
      </Layer>
      <Layer style={{ padding: "60px 70px 62px" }}>
        <div style={{ display: "flex", flexDirection: "column", height: 100 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Label color={p.ink} size={18}>{collabLine(data.houses).toUpperCase()}</Label>
              <Label color={p.muted} size={14}>IIT MADRAS · BS DEGREE</Label>
            </div>
            <div style={{ display: "flex", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 30, color: p.ink, lineHeight: 1 }}>
              {`Vol. ${when.year.slice(2)} — ${when.monthLong}`}
            </div>
          </div>
          <div style={{ display: "flex", height: 3, background: p.ink, marginTop: 16 }} />
          <div style={{ display: "flex", height: 1, background: p.ink, marginTop: 4 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: 940 - W - 70, height: W, marginTop: BOARD_TOP - 60 - 100 }}>
          <Label color={p.accent}>{data.eventType === "others" ? "SPECIAL EDITION" : EVENT_LABELS[data.eventType].toUpperCase()}</Label>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 4 }}>
            <div style={{ display: "flex", fontFamily: "DMSerif", fontSize: compact ? 150 : 184, lineHeight: 0.95, color: p.ink, letterSpacing: -4 }}>
              {when.day}
            </div>
            <div style={{ display: "flex", flexDirection: "column", paddingBottom: compact ? 14 : 20, gap: 2 }}>
              <div style={{ display: "flex", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 34, color: p.ink, lineHeight: 1 }}>{when.monthLong}</div>
              <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 20, color: p.muted }}>{when.weekdayLong}</div>
            </div>
          </div>
          <Spacer grow={1} />
          {highlights.length ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {highlights.map((h, i) => (
                <div
                  key={h}
                  style={{ display: "flex", alignItems: "baseline", gap: 16, padding: compact ? "7px 0" : "9px 0", borderTop: `1px solid ${p.muted}` }}
                >
                  <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 15, letterSpacing: 2, color: p.accent }}>{`0${i + 1}`}</div>
                  <div style={{ display: "flex", fontFamily: "DMSerif", fontSize: compact ? 26 : 29, color: p.ink }}>{h}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <Spacer grow={1} />
        <div style={{ display: "flex", fontFamily: "DMSerif", fontSize: size, lineHeight: 1, letterSpacing: -1.5, color: p.ink, maxWidth: 940 }}>{title}</div>
        {tagline ? (
          <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontWeight: 600, fontSize: 38, color: p.muted, marginTop: 12 }}>{tagline}</div>
        ) : null}
        <div style={{ display: "flex", height: 1, background: p.ink, margin: "24px 0 22px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 30 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, flexShrink: 1 }}>
            <div style={{ display: "flex", gap: 34 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                <Label color={p.accent} size={14}>TIME</Label>
                <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 25, color: p.ink }}>{when.timeRange}</div>
              </div>
              <div style={{ display: "flex", width: 1, background: p.muted }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 1 }}>
                <Label color={p.accent} size={14}>{data.mode === "online" ? "JOIN ON" : "VENUE"}</Label>
                <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 25, color: p.ink }}>
                  {truncate(ctx.where, ctx.qr ? 26 : 56)}
                </div>
                {ctx.linkLabel ? (
                  <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18, color: p.muted }}>{truncate(ctx.linkLabel, 34)}</div>
                ) : null}
              </div>
            </div>
            <LogoRows houses={data.houses} plate="#FFFDF8" ring={p.ink} max={64} width={ctx.qr ? 680 : 760} />
          </div>
          {ctx.qr ? (
            <Qr ctx={ctx} ink={p.muted} size={132} label="Your move" />
          ) : (
            <div style={{ display: "flex", fontFamily: "DMSerif", fontStyle: "italic", fontSize: 40, color: p.accent, flexShrink: 0, whiteSpace: "nowrap" }}>Your move.</div>
          )}
        </div>
      </Layer>
    </Frame>
  );
}

export const checkmateNoir: Template = {
  id: "checkmate-noir",
  name: "Checkmate Noir",
  eventTypes: ["game-night", "others"],
  modes: ["online", "offline"],
  moods: ["chess", "strategy", "codenames", "quiz", "trivia", "debate", "puzzle", "board", "mind", "logic"],
  palettes: [
    { id: "ivory", name: "Ivory & Ink", bg: "#F3EEE3", bg2: "#E4DCCB", ink: "#161412", muted: "#635B4F", accent: "#C2362B", accent2: "#8C2A22" },
    { id: "noir", name: "Noir Brass", bg: "#0F0F10", bg2: "#1D1D20", ink: "#F0EBE1", muted: "#A39D92", accent: "#D6A64E", accent2: "#8F6D2F" },
    { id: "sage", name: "Sage Club", bg: "#E8ECE3", bg2: "#D6DDCF", ink: "#13241C", muted: "#4E6057", accent: "#D35F27", accent2: "#9A4318" },
  ],
  render,
};
