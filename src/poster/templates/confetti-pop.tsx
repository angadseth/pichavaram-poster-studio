import { Art, Frame, Grain, Layer, Logos, Qr, collabLine } from "../kit";
import type { Palette, RenderCtx, Template } from "../types";
import { EVENT_LABELS } from "../types";
import { svgUri, truncate } from "../util";

/** Third flat colour per palette; the set stays deliberately small. */
const EXTRA: Record<string, string> = {
  sorbet: "#F2B33D",
  disco: "#5FD3C3",
  citrus: "#FFFFFF",
};

function swatch(p: Palette): string[] {
  return [p.accent, p.accent2, EXTRA[p.id] ?? p.muted];
}

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

const f = (n: number) => n.toFixed(1);

function sparkle(cx: number, cy: number, r: number, fill: string, rot: number) {
  const k = r * 0.16;
  return `<path transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)})" d="M0,${-r} C${k},${-k} ${k},${-k} ${r},0 C${k},${k} ${k},${k} 0,${r} C${-k},${k} ${-k},${k} ${-r},0 C${-k},${-k} ${-k},${-k} 0,${-r} Z" fill="${fill}"/>`;
}

function halfMoon(cx: number, cy: number, r: number, fill: string, rot: number) {
  return `<path transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)})" d="M${-r},0 A${r},${r} 0 0 1 ${r},0 Z" fill="${fill}"/>`;
}

function squiggle(x: number, y: number, len: number, amp: number, color: string, w: number, rot: number) {
  const step = 40;
  let d = `M0,0`;
  for (let i = 0; i * step < len; i++) d += ` q${step / 2},${i % 2 ? amp : -amp} ${step},0`;
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function art(ctx: RenderCtx) {
  const { p, rng } = ctx;
  const [c1, c2, c3] = swatch(p);
  const j = (n: number) => (rng() - 0.5) * 2 * n; // jitter ±n
  const line = isLight(p.bg) ? p.ink : p.muted;
  // one composed cluster, top right, fully inside the frame
  const cx = 820 + j(12);
  const cy = 236 + j(10);
  const r = 150 + j(8);
  const shapes = [
    `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${c1}"/>`,
    halfMoon(cx - 112 + j(8), cy + 104 + j(6), 84 + j(6), c2, 180 + j(10)),
    sparkle(cx - r - 70 + j(10), cy - 62 + j(12), 38 + j(5), c3 === "#FFFFFF" ? p.ink : c3, j(15)),
    squiggle(cx + 4 + j(8), cy + r + 30 + j(4), 140, 12, line, 8, -5 + j(4)),
    `<circle cx="${f(cx + r - 4 + j(4))}" cy="${f(cy + r - 36 + j(4))}" r="20" fill="none" stroke="${line}" stroke-width="7"/>`,
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <radialGradient id="g" cx="0.15" cy="0.9" r="1.1"><stop offset="0" stop-color="${p.bg2}"/><stop offset="0.75" stop-color="${p.bg}"/></radialGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#g)"/>
    <rect x="34" y="34" width="1012" height="1282" rx="26" fill="none" stroke="${line}" stroke-opacity="0.3" stroke-width="2"/>
    ${shapes.join("")}
  </svg>`;
}

/** Scalloped sticker badge. */
function stickerSvg(size: number, fill: string, edge: string) {
  const c = size / 2;
  const R = c - 10;
  const n = 18;
  let d = "";
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const am = ((i + 0.5) / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const p0 = [c + R * Math.cos(a0), c + R * Math.sin(a0)];
    const pm = [c + (R + 14) * Math.cos(am), c + (R + 14) * Math.sin(am)];
    const p1 = [c + R * Math.cos(a1), c + R * Math.sin(a1)];
    d += `${i === 0 ? `M${f(p0[0])},${f(p0[1])}` : ""} Q${f(pm[0])},${f(pm[1])} ${f(p1[0])},${f(p1[1])}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path d="${d} Z" fill="${fill}"/><circle cx="${c}" cy="${c}" r="${R - 14}" fill="none" stroke="${edge}" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round"/></svg>`;
}

/** Split words into `n` lines with the shortest possible longest line. */
function balance(words: string[], n: number): string[][] {
  if (words.length <= n) return words.map((w) => [w]);
  const len = (a: string[]) => a.join(" ").length;
  let best: string[][] = [words];
  let bestMax = Infinity;
  const go = (i: number, left: number, acc: string[][]) => {
    if (left === 1) {
      const lines = [...acc, words.slice(i)];
      const m = Math.max(...lines.map(len));
      if (m < bestMax) [best, bestMax] = [lines, m];
      return;
    }
    for (let k = i + 1; k <= words.length - left + 1; k++) go(k, left - 1, [...acc, words.slice(i, k)]);
  };
  go(0, n, []);
  return best;
}

/** Pick the line count (1–4) that lets the title be largest, with balanced lines. */
function layoutTitle(title: string) {
  const words = title.split(/\s+/);
  const k = 0.88; // Syne 800 average glyph width (measured)
  let pick = { lines: [words], size: 0 };
  for (let n = 1; n <= Math.min(4, words.length); n++) {
    const lines = balance(words, n);
    const longest = Math.max(...lines.map((l) => l.join(" ").length));
    const size = Math.floor(Math.min(136, 300 / n, 900 / (longest * k)));
    if (size > pick.size + 4) pick = { lines, size };
  }
  return pick;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const sw = swatch(p);
  const { lines, size } = layoutTitle(truncate(data.title, 60));
  const accentLast = lines.flat().length > 1;
  const note = truncate(data.tagline, 70) || "you're invited!";
  const stickerInk = isLight(p.accent) ? "#1A1433" : "#FFFFFF";
  const label = data.eventType === "others" ? (data.mode === "online" ? "Live on Meet" : "In Person") : EVENT_LABELS[data.eventType];
  const S = 190;
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={0.1} />
      <Layer style={{ padding: "76px 78px 72px" }}>
        {/* header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, maxWidth: 470 }}>
          <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 20, letterSpacing: 3, color: p.ink, lineHeight: 1.3 }}>
            {truncate(collabLine(data.houses), 40).toUpperCase()}
          </div>
          <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 18, letterSpacing: 4, color: p.muted }}>
            IIT MADRAS · BS DEGREE
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontFamily: "Grotesk",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 4,
              color: p.ink,
              border: `1.5px solid ${p.ink}`,
              padding: "7px 16px",
              borderRadius: 999,
            }}
          >
            {label.toUpperCase()}
          </div>
        </div>
        {/* keeps the note clear of the art cluster (bottom edge ≈ y 430) */}
        <div style={{ display: "flex", flexGrow: 1, minHeight: 236 }} />
        {/* handwritten note */}
        <div
          style={{
            display: "flex",
            fontFamily: "Caveat",
            fontWeight: 700,
            fontSize: note.length > 40 ? 38 : 48,
            lineHeight: 1.05,
            color: sw[1],
            maxWidth: 880,
            marginBottom: 10,
            textWrap: "balance",
            transform: "rotate(-2deg)",
          }}
        >
          {note}
        </div>
        {/* title: balanced lines, last word picked out in the accent */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {lines.map((ln, li) => (
            <div key={li} style={{ display: "flex", columnGap: size * 0.26 }}>
              {ln.map((w, wi) => (
                <div
                  key={`${w}-${wi}`}
                  style={{
                    display: "flex",
                    fontFamily: "Syne",
                    fontWeight: 800,
                    fontSize: size,
                    lineHeight: 1.02,
                    letterSpacing: -size * 0.03,
                    color: accentLast && li === lines.length - 1 && wi === ln.length - 1 ? p.accent : p.ink,
                  }}
                >
                  {w}
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* sticker date + details */}
        <div style={{ display: "flex", alignItems: "center", gap: 34, marginTop: 28 }}>
          <div style={{ display: "flex", position: "relative", width: S, height: S, flexShrink: 0, transform: "rotate(-8deg)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src={svgUri(stickerSvg(S, p.accent, stickerInk))} width={S} height={S} style={{ position: "absolute", left: 0, top: 0 }} />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: stickerInk,
              }}
            >
              <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 4 }}>{when.weekday}</div>
              <div style={{ display: "flex", fontFamily: "Unbounded", fontWeight: 800, fontSize: 60, lineHeight: 1 }}>{when.day}</div>
              <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 19, letterSpacing: 5 }}>{when.month}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 1 }}>
            <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 38, color: p.ink, lineHeight: 1.1 }}>
              {`${when.weekdayLong}, ${Number(when.day)} ${when.monthLong}`}
            </div>
            <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 600, fontSize: 27, color: p.ink }}>{when.timeRange}</div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginTop: 10 }}>
              <div style={{ display: "flex", width: 11, height: 11, borderRadius: 11, background: sw[1], marginTop: 12, flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 26, lineHeight: 1.3, color: p.ink, maxWidth: 640, wordBreak: "break-word" }}>
                  {ctx.where}
                </div>
                {ctx.linkLabel ? (
                  <div style={{ display: "flex", fontFamily: "Mono", fontSize: 21, color: p.muted }}>{truncate(ctx.linkLabel, 40)}</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        {/* highlights: quiet outlined pills with a coloured bullet */}
        {data.highlights.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26, maxWidth: 924 }}>
            {data.highlights.slice(0, 4).map((h, i) => (
              <div
                key={h}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 20px",
                  borderRadius: 999,
                  border: `1.5px solid ${p.ink}`,
                  color: p.ink,
                  fontFamily: "Manrope",
                  fontWeight: 700,
                  fontSize: 22,
                }}
              >
                <div style={{ display: "flex", width: 10, height: 10, borderRadius: 10, background: sw[i % 2 ? 1 : 0] }} />
                {truncate(h, 24)}
              </div>
            ))}
          </div>
        ) : null}
        <div style={{ display: "flex", flexGrow: 1, minHeight: 28, maxHeight: 110 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30 }}>
          <Logos houses={data.houses} plate="#FFFDF8" ring={p.ink} max={74} gap={14} width={ctx.qr ? 640 : 924} justify="flex-start" />
          <Qr ctx={ctx} ink={p.muted} size={124} />
        </div>
      </Layer>
    </Frame>
  );
}

export const confettiPop: Template = {
  id: "confetti-pop",
  name: "Confetti Pop",
  eventTypes: ["fun-night", "others"],
  modes: ["online", "offline"],
  moods: ["fun", "games", "antakshari", "party", "celebration", "carnival", "chill"],
  palettes: [
    { id: "sorbet", name: "Sorbet", bg: "#F8F0E5", bg2: "#F6E0CB", ink: "#1E1433", muted: "#5B4E6E", accent: "#EE5038", accent2: "#11897C" },
    { id: "disco", name: "Midnight Disco", bg: "#150F30", bg2: "#271B57", ink: "#FFF6EA", muted: "#C6BBE6", accent: "#FFC940", accent2: "#FF6FA5" },
    { id: "citrus", name: "Citrus Punch", bg: "#FFD84A", bg2: "#FFC72C", ink: "#1A1446", muted: "#463B6A", accent: "#F2452F", accent2: "#2E48F0" },
  ],
  render,
};
