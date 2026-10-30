import { Art, Frame, Grain, Layer, Logos, Qr, Spacer, collabLine } from "../kit";
import type { Palette, RenderCtx, Template } from "../types";
import { EVENT_LABELS } from "../types";
import { fitSize, truncate } from "../util";

/** Extra aurora hues per palette (beyond accent/accent2). */
const HUES: Record<string, [string, string]> = {
  polar: ["#2FA8FF", "#FF7AC6"],
  dawn: ["#C8A4FF", "#FFD772"],
  lagoon: ["#3A7BFF", "#9BF27A"],
};

function isLight(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}

function glass(p: Palette) {
  return isLight(p.bg)
    ? {
        fill: "linear-gradient(140deg, rgba(255,255,255,0.72), rgba(255,255,255,0.38))",
        chip: "rgba(255,255,255,0.6)",
        line: "rgba(255,255,255,0.95)",
        rule: "rgba(27,26,46,0.12)",
      }
    : {
        fill: "linear-gradient(140deg, rgba(255,255,255,0.17), rgba(255,255,255,0.05))",
        chip: "rgba(255,255,255,0.09)",
        line: "rgba(255,255,255,0.3)",
        rule: "rgba(255,255,255,0.14)",
      };
}

const f = (n: number) => n.toFixed(1);

function art(ctx: RenderCtx) {
  const { p, rng } = ctx;
  const [h3, h4] = HUES[p.id] ?? [p.muted, p.bg2];
  const light = isLight(p.bg);
  const j = (n: number) => (rng() - 0.5) * 2 * n;
  // soft blobs as radial-gradient ellipses: same glow as a gaussian blur at a fraction of the cost
  const defs: string[] = [];
  const glow = (id: string, c: string, o: number) =>
    defs.push(
      `<radialGradient id="${id}"><stop offset="0" stop-color="${c}" stop-opacity="${o}"/><stop offset="0.3" stop-color="${c}" stop-opacity="${(o * 0.8).toFixed(3)}"/><stop offset="0.6" stop-color="${c}" stop-opacity="${(o * 0.38).toFixed(3)}"/><stop offset="0.82" stop-color="${c}" stop-opacity="${(o * 0.1).toFixed(3)}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`,
    );
  const blobs = [
    { x: 860 + j(60), y: 230 + j(60), rx: 640, ry: 520, c: p.accent, o: light ? 0.8 : 0.66 },
    { x: 170 + j(60), y: 540 + j(80), rx: 580, ry: 470, c: p.accent2, o: light ? 0.75 : 0.64 },
    { x: 560 + j(80), y: 900 + j(60), rx: 680, ry: 400, c: h3, o: light ? 0.6 : 0.5 },
    { x: 980 + j(40), y: 1180 + j(60), rx: 460, ry: 400, c: h4, o: light ? 0.65 : 0.36 },
    { x: 120 + j(40), y: 90 + j(40), rx: 400, ry: 310, c: h3, o: light ? 0.45 : 0.4 },
  ]
    .map((b, i) => {
      glow(`b${i}`, b.c, b.o);
      return `<ellipse cx="${f(b.x)}" cy="${f(b.y)}" rx="${b.rx}" ry="${b.ry}" fill="url(#b${i})" transform="rotate(${f(j(25))} ${f(b.x)} ${f(b.y)})"/>`;
    })
    .join("");
  // tall aurora curtains
  glow("c0", h3, light ? 0.42 : 0.34);
  glow("c1", p.accent, light ? 0.42 : 0.34);
  const curtains = Array.from({ length: 4 }, (_, i) => {
    const x = 380 + i * 150 + j(40);
    return `<ellipse cx="${f(x)}" cy="${f(380 + j(60))}" rx="${f(70 + rng() * 40)}" ry="${f(380 + rng() * 120)}" fill="url(#c${i % 2})" transform="rotate(${f(18 + j(8))} ${f(x)} 380)"/>`;
  }).join("");
  // fine contour lines for a crafted, editorial finish
  const cx = 860;
  const cy = 230;
  const rings = Array.from({ length: 9 }, (_, i) => `<circle cx="${cx}" cy="${cy}" r="${200 + i * 70}" fill="none" stroke="${light ? p.ink : "#FFFFFF"}" stroke-opacity="${(0.05 - i * 0.004).toFixed(3)}" stroke-width="1.2"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="bg" x1="0" x2="0.4" y1="0" y2="1"><stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.bg}"/></linearGradient>
      ${defs.join("")}
    </defs>
    <rect width="1080" height="1350" fill="url(#bg)"/>
    ${blobs}
    ${curtains}
    ${rings}
  </svg>`;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const g = glass(p);
  const title = truncate(data.title, 60);
  const size = fitSize(title, { width: 930, maxLines: 3, max: 138, min: 62, k: 0.5 });
  const tagline = truncate(data.tagline, 90);
  const label =
    data.eventType === "others" ? (data.mode === "online" ? "Live Session" : "In-person Session") : EVENT_LABELS[data.eventType];
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={0.09} />
      <Layer style={{ padding: "64px 70px 62px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              borderRadius: 999,
              background: g.chip,
              border: `1.5px solid ${g.line}`,
            }}
          >
            <div style={{ display: "flex", width: 9, height: 9, borderRadius: 9, background: p.accent }} />
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 3, color: p.ink }}>
              {truncate(collabLine(data.houses), 36).toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 16, letterSpacing: 4, color: p.muted }}>
            IIT MADRAS · BS DEGREE
          </div>
        </div>
        <Spacer grow={1} />
        {/* title block */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ display: "flex", width: 44, height: 2, background: p.accent }} />
          <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 20, letterSpacing: 6, color: p.accent }}>
            {label.toUpperCase()}
          </div>
        </div>
        <div style={{ display: "flex", fontFamily: "DMSerif", fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.015, color: p.ink, maxWidth: 940 }}>
          {title}
        </div>
        {tagline ? (
          <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 400, fontSize: 30, lineHeight: 1.35, color: p.muted, marginTop: 18, maxWidth: 860 }}>
            {tagline}
          </div>
        ) : null}
        <Spacer grow={1} />
        {/* frosted card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 30,
            padding: "36px 40px",
            borderRadius: 36,
            background: g.fill,
            border: `1.5px solid ${g.line}`,

          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 30 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 22, flexShrink: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
                <div style={{ display: "flex", fontFamily: "DMSerif", fontSize: 116, lineHeight: 0.9, color: p.ink }}>{when.day}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 22, letterSpacing: 5, color: p.accent }}>
                    {`${when.month} ${when.year} · ${when.weekday}`}
                  </div>
                  <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 30, color: p.ink }}>{when.timeRange}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 20, borderTop: `1.5px solid ${g.rule}` }}>
                <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 16, letterSpacing: 5, color: p.muted }}>
                  {data.mode === "online" ? "JOIN ONLINE" : "VENUE"}
                </div>
                <div style={{ display: "flex", fontFamily: "Manrope", fontWeight: 800, fontSize: 30, lineHeight: 1.25, color: p.ink, maxWidth: ctx.qr ? 560 : 840 }}>
                  {truncate(ctx.where, ctx.qr ? 32 : 72)}
                </div>
                {ctx.linkLabel ? (
                  <div style={{ display: "flex", fontFamily: "Mono", fontSize: 21, color: p.muted }}>{truncate(ctx.linkLabel, 40)}</div>
                ) : null}
              </div>
            </div>
            <Qr ctx={ctx} ink={p.muted} size={136} />
          </div>
          {data.highlights.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 26 }}>
              {data.highlights.slice(0, 4).map((h) => (
                <div
                  key={h}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 18px",
                    borderRadius: 999,
                    background: g.chip,
                    border: `1px solid ${g.line}`,
                    color: p.ink,
                    fontFamily: "Manrope",
                    fontWeight: 600,
                    fontSize: 22,
                  }}
                >
                  <div style={{ display: "flex", width: 7, height: 7, borderRadius: 7, background: p.accent }} />
                  {truncate(h, 24)}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div style={{ display: "flex", marginTop: 30 }}>
          <Logos houses={data.houses} plate="#FFFDF8" ring={g.line} max={70} gap={14} width={940} justify="flex-start" />
        </div>
      </Layer>
    </Frame>
  );
}

export const auroraGlass: Template = {
  id: "aurora-glass",
  name: "Aurora Glass",
  eventTypes: "all",
  modes: ["online", "offline"],
  moods: ["talk", "workshop", "session", "webinar", "career", "study", "wellness", "meditation"],
  palettes: [
    { id: "polar", name: "Polar Night", bg: "#050A19", bg2: "#0D1B3A", ink: "#F3F6FF", muted: "#AEBBDA", accent: "#6FF0C4", accent2: "#8A66FF" },
    { id: "dawn", name: "Soft Dawn", bg: "#F7F1EC", bg2: "#FCE6DA", ink: "#1C1A2E", muted: "#5A566E", accent: "#CC5A36", accent2: "#8EA6FF" },
    { id: "lagoon", name: "Deep Lagoon", bg: "#031B1C", bg2: "#073A3A", ink: "#EEFFFA", muted: "#A5CEC6", accent: "#55E8CB", accent2: "#EE86B4" },
  ],
  render,
};
