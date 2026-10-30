import { Art, Frame, Grain, Layer, Logos, Qr, Spacer, collabLine } from "../kit";
import type { Palette, RenderCtx, Template } from "../types";
import { EVENT_LABELS } from "../types";
import { fitSize, svgUri, truncate } from "../util";

/** Two extra flat colours per palette for the confetti set. */
const EXTRA: Record<string, [string, string]> = {
  sorbet: ["#FFC23D", "#8A6BFF"],
  disco: ["#4FD6C4", "#FF8A3D"],
  citrus: ["#FF8FC6", "#FFFFFF"],
};

function swatch(p: Palette): string[] {
  const [c3, c4] = EXTRA[p.id] ?? [p.muted, p.bg2];
  return [p.accent, p.accent2, c3, c4];
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
  const step = 46;
  let d = `M0,0`;
  for (let i = 0; i * step < len; i++) d += ` q${step / 2},${i % 2 ? amp : -amp} ${step},0`;
  return `<path transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})" d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function dots(x: number, y: number, cols: number, rows: number, gap: number, r: number, fill: string) {
  let s = "";
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) s += `<circle cx="${x + i * gap}" cy="${y + j * gap}" r="${r}" fill="${fill}"/>`;
  return s;
}

function art(ctx: RenderCtx) {
  const { p, rng } = ctx;
  const [c1, c2, c3, c4] = swatch(p);
  const j = (n: number) => (rng() - 0.5) * 2 * n; // jitter ±n
  const dotInk = isLight(p.bg) ? p.ink : p.muted;
  const shapes = [
    // right: big sun + ring
    `<circle cx="${f(870 + j(24))}" cy="${f(150 + j(20))}" r="${f(220 + j(18))}" fill="${c1}"/>`,
    `<circle cx="${f(668 + j(14))}" cy="${f(132 + j(14))}" r="54" fill="none" stroke="${p.ink}" stroke-width="13"/>`,
    halfMoon(770 + j(20), 262 + j(10), 104 + j(8), c2, 180 + j(20)),
    sparkle(1004 + j(10), 368 + j(10), 62 + j(8), c4 === "#FFFFFF" ? p.ink : c4, j(15)),
    dots(560, 230 + Math.round(j(10)), 5, 4, 24, 5, dotInk),
    // left: moon, sparkle, pill
    halfMoon(150 + j(18), 300 + j(12), 104 + j(10), c3, -30 + j(30)),
    sparkle(400 + j(16), 228 + j(14), 34 + j(5), c2, j(20)),
    `<rect x="${f(250 + j(14))}" y="${f(330 + j(8))}" width="150" height="46" rx="23" fill="${c4 === "#FFFFFF" ? "#FFFFFF" : c1}" transform="rotate(${f(-12 + j(8))} 325 353)"/>`,
    squiggle(440 + j(20), 330 + j(10), 250, 22, p.ink, 12, -8 + j(6)),
  ];
  // a light sprinkle of confetti in the side gutters
  let sprinkle = "";
  const cols = [c1, c2, c3];
  for (let i = 0; i < 9; i++) {
    const left = i % 2 === 0;
    const x = left ? 14 + rng() * 26 : 1040 + rng() * 26;
    const y = 470 + rng() * 560;
    const c = cols[i % 3];
    sprinkle +=
      i % 3 === 0
        ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(6 + rng() * 5)}" fill="${c}"/>`
        : `<rect x="${f(x - 4)}" y="${f(y - 10)}" width="8" height="22" rx="4" fill="${c}" transform="rotate(${f(rng() * 180)} ${f(x)} ${f(y)})"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <radialGradient id="g" cx="0.2" cy="0.85" r="1"><stop offset="0" stop-color="${p.bg2}"/><stop offset="0.7" stop-color="${p.bg}"/></radialGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#g)"/>
    ${shapes.join("")}
    ${sprinkle}
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
    const pm = [c + (R + 16) * Math.cos(am), c + (R + 16) * Math.sin(am)];
    const p1 = [c + R * Math.cos(a1), c + R * Math.sin(a1)];
    d += `${i === 0 ? `M${f(p0[0])},${f(p0[1])}` : ""} Q${f(pm[0])},${f(pm[1])} ${f(p1[0])},${f(p1[1])}`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path d="${d} Z" fill="${fill}"/><circle cx="${c}" cy="${c}" r="${R - 14}" fill="none" stroke="${edge}" stroke-width="2" stroke-dasharray="3 7" stroke-linecap="round"/></svg>`;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const sw = swatch(p);
  const title = truncate(data.title, 60);
  const size = fitSize(title, { width: 930, maxLines: 3, max: 132, min: 56, k: 0.8 });
  const words = title.split(" ");
  const accentLast = words.length > 1;
  const note = truncate(data.tagline, 50) || "you're invited!";
  const stickerInk = isLight(p.accent) ? "#1A1433" : "#FFFFFF";
  const S = 200;
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={0.1} />
      <Layer style={{ padding: "58px 70px 60px" }}>
        {/* header */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 500 }}>
          <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 20, letterSpacing: 3, color: p.ink, lineHeight: 1.25 }}>
            {truncate(collabLine(data.houses), 40).toUpperCase()}
          </div>
          <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 16, letterSpacing: 4, color: p.muted }}>
            IIT MADRAS · BS DEGREE
          </div>
        </div>
        <div style={{ display: "flex", height: 280, flexShrink: 0 }} />
        {/* handwritten note + event label */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 6 }}>
          <div
            style={{
              display: "flex",
              fontFamily: "Grotesk",
              fontWeight: 700,
              fontSize: 17,
              letterSpacing: 4,
              color: isLight(p.ink) ? p.bg : "#FFFFFF",
              background: p.ink,
              padding: "7px 14px",
              borderRadius: 999,
            }}
          >
            {(data.eventType === "others" ? (data.mode === "online" ? "Live on Meet" : "In Person") : EVENT_LABELS[data.eventType]).toUpperCase()}
          </div>
          <div style={{ display: "flex", fontFamily: "Caveat", fontWeight: 700, fontSize: note.length > 38 ? 34 : note.length > 26 ? 40 : 46, color: sw[1], transform: "rotate(-3deg)" }}>{note}</div>
        </div>
        {/* title, last word picked out in the accent */}
        <div style={{ display: "flex", flexWrap: "wrap", maxWidth: 940, columnGap: size * 0.26 }}>
          {words.map((w, i) => (
            <div
              key={`${w}-${i}`}
              style={{
                display: "flex",
                fontFamily: "Syne",
                fontWeight: 800,
                fontSize: size,
                lineHeight: 1.0,
                letterSpacing: -size * 0.03,
                color: accentLast && i === words.length - 1 ? p.accent : p.ink,
              }}
            >
              {w}
            </div>
          ))}
        </div>
        {/* sticker date + details */}
        <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 30 }}>
          <div style={{ display: "flex", position: "relative", width: S, height: S, flexShrink: 0, transform: "rotate(-8deg)" }}>
            { }
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
              <div style={{ display: "flex", fontFamily: "Unbounded", fontWeight: 800, fontSize: 64, lineHeight: 1 }}>{when.day}</div>
              <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 20, letterSpacing: 5 }}>{when.month}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 1 }}>
            <div style={{ display: "flex", fontFamily: "Syne", fontWeight: 800, fontSize: 40, color: p.ink, lineHeight: 1.05 }}>
              {`${when.weekdayLong}, ${when.monthLong.slice(0, 3)} ${Number(when.day)}`}
            </div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 27, color: p.ink }}>{when.timeRange}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
              <div style={{ display: "flex", width: 12, height: 12, borderRadius: 12, background: sw[1] }} />
              <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 27, color: p.ink }}>{truncate(ctx.where, 38)}</div>
            </div>
            {ctx.linkLabel ? (
              <div style={{ display: "flex", fontFamily: "Mono", fontSize: 21, color: p.muted, marginLeft: 22 }}>{truncate(ctx.linkLabel, 40)}</div>
            ) : null}
          </div>
        </div>
        {/* highlight chips */}
        {data.highlights.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 30, maxWidth: 940 }}>
            {data.highlights.slice(0, 4).map((h, i) => {
              const bg = sw[i % sw.length];
              return (
                <div
                  key={h}
                  style={{
                    display: "flex",
                    padding: "10px 22px",
                    borderRadius: 999,
                    background: bg,
                    color: isLight(bg) ? "#1A1433" : "#FFFFFF",
                    fontFamily: "Grotesk",
                    fontWeight: 700,
                    fontSize: 23,
                    transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)`,
                  }}
                >
                  {truncate(h, 24)}
                </div>
              );
            })}
          </div>
        ) : null}
        <Spacer grow={1} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 30 }}>
          <Logos houses={data.houses} plate="#FFFDF8" ring={p.ink} max={78} gap={16} width={ctx.qr ? 640 : 940} justify="flex-start" />
          <Qr ctx={ctx} ink={p.muted} size={132} />
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
    { id: "sorbet", name: "Sorbet", bg: "#FFF3E3", bg2: "#FFE0C2", ink: "#1E1433", muted: "#5B4E6E", accent: "#FF5A45", accent2: "#16A595" },
    { id: "disco", name: "Midnight Disco", bg: "#160F33", bg2: "#2C1F63", ink: "#FFF6EA", muted: "#C6BBE6", accent: "#FFC940", accent2: "#FF67A0" },
    { id: "citrus", name: "Citrus Punch", bg: "#FFD83A", bg2: "#FFC21A", ink: "#1A1446", muted: "#463B6A", accent: "#FF4A36", accent2: "#2E48F0" },
  ],
  render,
};
