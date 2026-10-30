import { Art, Frame, Grain, Layer, Logos, Qr, collabLine } from "../kit";
import type { RenderCtx, Template } from "../types";
import { EVENT_LABELS } from "../types";
import { fitSize, truncate } from "../util";

// Fixed geometry shared by the art layer and the text layers.
const SIGN = { x: 90, y: 150, w: 900, h: 450 };
const PANEL = { x: 142, y: 202, w: 796, h: 346 };
const TICKET = { x: 90, y: 648, w: 900, h: 236, cut: 712 };

/** Largest title size that fits both the line budget and the panel height. */
function titleSize(text: string, width: number, maxH: number, lh: number) {
  let best = 56;
  for (let lines = 1; lines <= 3; lines++) {
    const s = Math.min(fitSize(text, { width, maxLines: lines, max: 170, min: 56, k: 0.41 }), Math.floor(maxH / (lines * lh)));
    best = Math.max(best, s);
  }
  return best;
}

function bulbs(p: RenderCtx["p"]) {
  const x0 = SIGN.x + 24;
  const y0 = SIGN.y + 24;
  const x1 = SIGN.x + SIGN.w - 24;
  const y1 = SIGN.y + SIGN.h - 24;
  const pts: [number, number][] = [];
  const nx = 21;
  const ny = 10;
  for (let i = 0; i <= nx; i++) {
    const x = x0 + ((x1 - x0) * i) / nx;
    pts.push([x, y0], [x, y1]);
  }
  for (let i = 1; i < ny; i++) {
    const y = y0 + ((y1 - y0) * i) / ny;
    pts.push([x0, y], [x1, y]);
  }
  const glow = pts.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="19" fill="url(#halo)"/>`).join("");
  const core = pts
    .map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7.5" fill="url(#bulb)"/><circle cx="${(x - 2).toFixed(1)}" cy="${(y - 2.5).toFixed(1)}" r="2.2" fill="#fff" fill-opacity="0.9"/>`)
    .join("");
  return `${glow}${core}`;
}

function art(ctx: RenderCtx) {
  const { p, rng } = ctx;
  const t = TICKET;
  // drape folds: varying widths so each seed hangs a little differently
  let x = -10;
  let folds = "";
  while (x < 1090) {
    const w = 34 + rng() * 30;
    folds += `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="1350" fill="url(#fold)"/>`;
    x += w;
  }
  const scallops = Array.from({ length: 9 }, (_, i) => {
    const sx = i * 120;
    return `<path d="M${sx},78 Q${sx + 60},${132 + rng() * 10} ${sx + 120},78 Z" fill="url(#val)"/><path d="M${sx},78 Q${sx + 60},${130} ${sx + 120},78" fill="none" stroke="${p.accent}" stroke-opacity="0.75" stroke-width="3"/>`;
  }).join("");
  const perf = `<line x1="${t.cut}" y1="${t.y + 26}" x2="${t.cut}" y2="${t.y + t.h - 26}" stroke="${p.bg}" stroke-opacity="0.55" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>`;
  const barcode = ctx.qr
    ? ""
    : Array.from({ length: 34 }, (_, i) => {
        const w = 2 + Math.floor(rng() * 4);
        return `<rect x="${t.cut + 44 + i * 5.5}" y="${t.y + 128}" width="${w}" height="64" fill="${p.bg}"/>`;
      }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="fold" x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity="0.55"/>
        <stop offset="0.35" stop-color="${p.accent2}" stop-opacity="0.9"/>
        <stop offset="0.55" stop-color="${p.accent2}"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.6"/>
      </linearGradient>
      <linearGradient id="shade" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${p.bg}" stop-opacity="0.15"/>
        <stop offset="0.7" stop-color="${p.bg}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${p.bg}" stop-opacity="0.92"/>
      </linearGradient>
      <radialGradient id="spot" cx="0.5" cy="0.32" r="0.62">
        <stop offset="0" stop-color="${p.bg}" stop-opacity="0"/>
        <stop offset="0.75" stop-color="${p.bg}" stop-opacity="0.55"/>
        <stop offset="1" stop-color="${p.bg}" stop-opacity="0.9"/>
      </radialGradient>
      <linearGradient id="val" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.accent2}"/>
      </linearGradient>
      <linearGradient id="frame" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="${p.accent}"/>
        <stop offset="0.45" stop-color="${p.accent}" stop-opacity="0.55"/>
        <stop offset="0.6" stop-color="${p.accent}"/>
        <stop offset="1" stop-color="${p.accent}" stop-opacity="0.6"/>
      </linearGradient>
      <linearGradient id="panel" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.bg}"/>
      </linearGradient>
      <radialGradient id="bulb" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#FFF4D2"/><stop offset="1" stop-color="${p.accent}"/>
      </radialGradient>
      <radialGradient id="halo"><stop offset="0.3" stop-color="${p.accent}" stop-opacity="0.75"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
      <radialGradient id="wash"><stop offset="0" stop-color="${p.accent}" stop-opacity="0.2"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient>
      <linearGradient id="drop" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.5"/></linearGradient>
      <mask id="tk">
        <rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" rx="18" fill="#fff"/>
        <circle cx="${t.cut}" cy="${t.y}" r="20" fill="#000"/>
        <circle cx="${t.cut}" cy="${t.y + t.h}" r="20" fill="#000"/>
        <circle cx="${t.x}" cy="${t.y + t.h / 2}" r="22" fill="#000"/>
        <circle cx="${t.x + t.w}" cy="${t.y + t.h / 2}" r="22" fill="#000"/>
      </mask>
    </defs>
    <rect width="1080" height="1350" fill="${p.bg}"/>
    ${folds}
    <rect width="1080" height="1350" fill="url(#shade)"/>
    <rect width="1080" height="1350" fill="url(#spot)"/>
    <ellipse cx="540" cy="380" rx="620" ry="420" fill="url(#wash)"/>
    <rect x="0" y="0" width="1080" height="80" fill="url(#val)"/>
    ${scallops}
    <rect x="0" y="0" width="1080" height="80" fill="#000" fill-opacity="0.18"/>
    <line x1="0" y1="78" x2="1080" y2="78" stroke="${p.accent}" stroke-width="3" stroke-opacity="0.8"/>
    <rect x="${SIGN.x + 10}" y="${SIGN.y + SIGN.h - 40}" width="${SIGN.w - 20}" height="64" rx="30" fill="url(#drop)"/>
    <rect x="${t.x + 10}" y="${t.y + t.h - 30}" width="${t.w - 20}" height="48" rx="20" fill="url(#drop)"/>
    <rect x="${SIGN.x}" y="${SIGN.y}" width="${SIGN.w}" height="${SIGN.h}" rx="30" fill="${p.bg}"/>
    <rect x="${SIGN.x + 3}" y="${SIGN.y + 3}" width="${SIGN.w - 6}" height="${SIGN.h - 6}" rx="28" fill="none" stroke="url(#frame)" stroke-width="6"/>
    <rect x="${SIGN.x + 46}" y="${SIGN.y + 46}" width="${SIGN.w - 92}" height="${SIGN.h - 92}" rx="12" fill="none" stroke="${p.accent}" stroke-opacity="0.5" stroke-width="2"/>
    <rect x="${PANEL.x}" y="${PANEL.y}" width="${PANEL.w}" height="${PANEL.h}" rx="10" fill="url(#panel)"/>
    ${bulbs(p)}
    <g mask="url(#tk)">
      <rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="${p.accent}"/>
      <rect x="${t.cut}" y="${t.y}" width="${t.x + t.w - t.cut}" height="${t.h}" fill="#fff" fill-opacity="0.22"/>
      <rect x="${t.x + 16}" y="${t.y + 16}" width="${t.cut - t.x - 32}" height="${t.h - 32}" rx="8" fill="none" stroke="${p.bg}" stroke-opacity="0.35" stroke-width="1.5"/>
    </g>
    ${perf}
    ${barcode}
  </svg>`;
}

function Diamond({ color, size = 10 }: { color: string; size?: number }) {
  return <div style={{ display: "flex", width: size, height: size, background: color, transform: "rotate(45deg)" }} />;
}

function render(ctx: RenderCtx) {
  const { data, p, when, rng } = ctx;
  const title = truncate(data.title, 60).toUpperCase();
  const tagline = truncate(data.tagline, 70);
  const longTag = tagline.length > 44; // wraps to two balanced lines
  const lh = 0.9;
  const size = titleSize(title, PANEL.w - 80, !tagline ? 290 : longTag ? 196 : 236, lh);
  // ticket line names the feature itself when it is short enough, else the event type
  const admit = (data.title.trim().length <= 24 ? data.title.trim() : EVENT_LABELS[data.eventType]).toUpperCase();
  const ticketNo = String(Math.floor(rng() * 900000) + 100000);
  const t = TICKET;
  const hl = data.highlights.slice(0, 4).map((h) => truncate(h, 22).toUpperCase());
  // one billing line when possible: shrink Bebas to fit ~900px, wrap below 30px
  const chars = hl.join("").length;
  const hlSize = Math.max(30, Math.min(40, Math.floor((900 - (hl.length - 1) * 48 - chars * 3) / Math.max(1, chars * 0.41))));
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      {/* house line on the valance */}
      <Layer style={{ height: 80, bottom: undefined, alignItems: "center", justifyContent: "center", gap: 2 }}>
        <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 21, letterSpacing: 6, color: p.ink }}>
          {truncate(collabLine(data.houses), 40).toUpperCase()}
        </div>
        <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 18, letterSpacing: 5, color: p.accent }}>
          IIT MADRAS · BS DEGREE
        </div>
      </Layer>
      {/* marquee panel */}
      <Layer
        style={{
          left: PANEL.x,
          top: PANEL.y,
          right: 1080 - PANEL.x - PANEL.w,
          bottom: 1350 - PANEL.y - PANEL.h,
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 40px",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Diamond color={p.accent} size={8} />
          <div style={{ display: "flex", fontFamily: "Monoton", fontSize: 30, letterSpacing: 4, color: p.accent }}>NOW SHOWING</div>
          <Diamond color={p.accent} size={8} />
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "Bebas",
            fontSize: size,
            lineHeight: lh,
            color: p.ink,
            textAlign: "center",
            justifyContent: "center",
            letterSpacing: 1,
            maxWidth: PANEL.w - 80,
          }}
        >
          {title}
        </div>
        {tagline ? (
          <div
            style={{
              display: "flex",
              fontFamily: "Cormorant",
              fontStyle: "italic",
              fontWeight: 600,
              fontSize: longTag ? 32 : 36,
              lineHeight: 1.12,
              color: p.muted,
              textAlign: "center",
              justifyContent: "center",
              textWrap: "balance",
              maxWidth: PANEL.w - 80,
            }}
          >
            {tagline}
          </div>
        ) : null}
      </Layer>
      {/* ticket: main part */}
      <Layer
        style={{
          left: t.x + 44,
          top: t.y + 34,
          right: 1080 - t.cut + 30,
          bottom: 1350 - t.y - t.h + 32,
          justifyContent: "space-between",
          color: p.bg,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 4 }}>
            {`ADMIT ALL · ${admit}`}
          </div>
          <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18, letterSpacing: 1, opacity: 0.75 }}>{`Nº ${ticketNo}`}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div style={{ display: "flex", fontFamily: "Bebas", fontSize: 138, lineHeight: 0.8, paddingTop: 12 }}>{when.day}</div>
          <div style={{ display: "flex", width: 2, height: 110, background: p.bg, opacity: 0.35 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", fontFamily: "Bebas", fontSize: 46, letterSpacing: 4, lineHeight: 1 }}>{`${when.month} ${when.year}`}</div>
            <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontWeight: 600, fontSize: 32, lineHeight: 1.1 }}>
              {when.weekdayLong}
            </div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 22, marginTop: 4 }}>{when.timeRange}</div>
          </div>
        </div>
      </Layer>
      {/* ticket: stub */}
      <Layer
        style={{
          left: t.cut,
          top: t.y,
          right: 1080 - t.x - t.w,
          bottom: 1350 - t.y - t.h,
          alignItems: "center",
          justifyContent: "center",
          color: p.bg,
        }}
      >
        {ctx.qr ? (
          <Qr ctx={ctx} size={138} ink={p.bg} label="Scan to join" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 86 }}>
            <div style={{ display: "flex", fontFamily: "Bebas", fontSize: 44, letterSpacing: 6 }}>ADMIT ONE</div>
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 18 }}>{`Nº ${ticketNo}`}</div>
          </div>
        )}
      </Layer>
      {/* billing block + where + logos */}
      <Layer style={{ top: t.y + t.h + 22, padding: "0 90px 44px", alignItems: "center", justifyContent: "space-evenly" }}>
        {hl.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "4px 20px", maxWidth: 900 }}>
            {hl.map((h, i) => (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {i > 0 ? <Diamond color={p.accent} size={8} /> : null}
                <div style={{ display: "flex", fontFamily: "Bebas", fontSize: hlSize, letterSpacing: 3, color: p.ink }}>{h}</div>
              </div>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontFamily: "Grotesk", fontWeight: 700, fontSize: 20, letterSpacing: 6, color: p.accent }}>
            {`${data.mode === "online" ? "STREAMING ON" : "SCREENING AT"} ${truncate(ctx.where, 44).toUpperCase()}`}
          </div>
          {ctx.linkLabel ? (
            <div style={{ display: "flex", fontFamily: "Mono", fontSize: 30, color: p.ink }}>{truncate(ctx.linkLabel, 44)}</div>
          ) : null}
        </div>
        <Logos houses={data.houses} plate="#FFFDF8" ring={p.accent} max={74} gap={16} width={900} />
      </Layer>
      <Grain opacity={0.13} />
    </Frame>
  );
}

export const cinemaMarquee: Template = {
  id: "cinema-marquee",
  name: "Cinema Marquee",
  eventTypes: ["movie-night"],
  modes: ["online"],
  moods: ["movie", "film", "cinema", "watch party", "screening", "bollywood", "anime"],
  palettes: [
    { id: "crimson", name: "Crimson Premiere", bg: "#12040A", bg2: "#3A0815", ink: "#FFF4E2", muted: "#E6BFAA", accent: "#F2D49A", accent2: "#A3122B" },
    { id: "teal", name: "Midnight Teal", bg: "#031114", bg2: "#0A2E35", ink: "#F3FBF8", muted: "#A9CFCB", accent: "#F6CB7E", accent2: "#0F6670" },
    { id: "plum", name: "Royal Plum", bg: "#0D0616", bg2: "#2B0F45", ink: "#FBF1FF", muted: "#CDB7E2", accent: "#FFD48C", accent2: "#6526A0" },
  ],
  render,
};
