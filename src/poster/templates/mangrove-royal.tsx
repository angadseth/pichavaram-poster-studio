import { Art, Frame, Grain, Layer, Logos, Qr, Spacer, collabLine } from "../kit";
import type { RenderCtx, Template } from "../types";
import { fitSize, svgUri, truncate } from "../util";

const f1 = (n: number) => n.toFixed(1);

/** Almond leaf pointing along +x, base at origin. */
function leaf(x: number, y: number, len: number, angle: number, stroke: string, fill: string) {
  const w = len * 0.32;
  return `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(angle)})" d="M0 0 C ${f1(len * 0.3)} ${f1(-w)} ${f1(len * 0.75)} ${f1(-w)} ${f1(len)} 0 C ${f1(len * 0.75)} ${f1(w)} ${f1(len * 0.3)} ${f1(w)} 0 0 Z M0 0 L ${f1(len * 0.85)} 0" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`;
}

/** Mangrove: knee-arched stilt roots into the water, short trunk, fanned leafy crown, drop roots. */
function mangrove(rng: () => number, x: number, water: number, h: number, stroke: string, fill: string, sw = 1.6) {
  const out: string[] = [];
  const base = water - h * 0.36;
  const lean = (rng() - 0.5) * h * 0.1;
  const tx = x + lean;
  const ty = water - h * 0.74;
  out.push(`<path d="M${f1(x)} ${f1(base + h * 0.06)} C ${f1(x - 3)} ${f1(base - h * 0.16)} ${f1(tx + 3)} ${f1(ty + h * 0.16)} ${f1(tx)} ${f1(ty)}" fill="none" stroke="${stroke}" stroke-width="${sw * 2}" stroke-linecap="round"/>`);
  // stilt roots: leave the trunk at different heights, bend at a knee, then angle down into the water
  const spreads = [0.1, 0.17, 0.24, 0.31, 0.38, 0.13, 0.21, 0.28, 0.35, 0.42];
  spreads.forEach((sp, i) => {
    const dir = i < 5 ? -1 : 1;
    const d = h * (sp + rng() * 0.04);
    const ys = base + h * (rng() * 0.16 - 0.08);
    const kx = x + dir * d * (0.55 + rng() * 0.3);
    const ky = ys + h * (rng() * 0.14 - 0.05);
    out.push(
      `<path d="M${f1(x)} ${f1(ys)} Q ${f1(x + dir * d * (0.2 + rng() * 0.3))} ${f1(ys - h * (0.03 + rng() * 0.08))} ${f1(kx)} ${f1(ky)} L ${f1(x + dir * d * (1.05 + rng() * 0.12))} ${f1(water)}" fill="none" stroke="${stroke}" stroke-width="${f1(sw * (1.35 - sp))}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  });
  // crown: branches fanning upward, leaves along each
  const n = 7;
  for (let b = 0; b < n; b++) {
    const a = -172 + (b * 164) / (n - 1) + (rng() - 0.5) * 10;
    const r = h * (0.3 + rng() * 0.14) * (b === 0 || b === n - 1 ? 0.8 : 1);
    const rad = (a * Math.PI) / 180;
    const bx = tx + Math.cos(rad) * r;
    const by = ty + Math.sin(rad) * r * 0.5;
    out.push(`<path d="M${f1(tx)} ${f1(ty)} Q ${f1(tx + Math.cos(rad) * r * 0.45)} ${f1(ty + Math.sin(rad) * r * 0.62 - h * 0.06)} ${f1(bx)} ${f1(by)}" fill="none" stroke="${stroke}" stroke-width="${f1(sw * 1.1)}" stroke-linecap="round"/>`);
    for (let l = 0; l < 4; l++) {
      const t = 0.35 + l * 0.2;
      const lx = tx + (bx - tx) * t;
      const ly = ty + (by - ty) * t - h * 0.03;
      out.push(leaf(lx, ly, h * (0.085 + rng() * 0.03), a + (l % 2 ? 48 : -48) + (rng() - 0.5) * 18, stroke, fill));
    }
    out.push(leaf(bx, by, h * 0.1, a + (rng() - 0.5) * 16, stroke, fill));
    // the outer branches let a thin prop root fall to the water
    if (b === 1 || b === n - 2) {
      const mx = tx + (bx - tx) * 0.7;
      const my = ty + (by - ty) * 0.7;
      out.push(`<path d="M${f1(mx)} ${f1(my)} C ${f1(mx + (rng() - 0.5) * 10)} ${f1(my + (water - my) * 0.4)} ${f1(mx + (rng() - 0.5) * 16)} ${f1(water - (water - my) * 0.3)} ${f1(mx + (rng() - 0.5) * 8)} ${f1(water)}" fill="none" stroke="${stroke}" stroke-width="${f1(sw * 0.7)}" stroke-opacity="0.8"/>`);
    }
  }
  return out.join("");
}

function ripples(rng: () => number, x1: number, x2: number, y: number, rows: number, stroke: string, op: number) {
  const out: string[] = [];
  for (let r = 0; r < rows; r++) {
    let x = x1 + rng() * 30;
    const yy = y + r * 11;
    while (x < x2) {
      const w = 20 + rng() * 70;
      out.push(`<path d="M${f1(x)} ${f1(yy)} q ${f1(w / 2)} -3 ${f1(Math.min(w, x2 - x))} 0" fill="none" stroke="${stroke}" stroke-opacity="${(op - r * 0.06).toFixed(2)}" stroke-width="1.2" stroke-linecap="round"/>`);
      x += w + 12 + rng() * 30;
    }
  }
  return out.join("");
}

/** Corner flourish drawn for the top-left corner of the inner frame. */
function corner(stroke: string) {
  return `<g fill="none" stroke="${stroke}" stroke-linecap="round">
    <path d="M0 64 A 64 64 0 0 1 64 0" stroke-width="1.4"/>
    <path d="M0 80 A 80 80 0 0 1 80 0" stroke-width="0.8" stroke-opacity="0.7"/>
    <path d="M16 16 L 30 30" stroke-width="1.2"/>
    <path d="M0 40 C 30 40 40 30 40 0" stroke-width="1.2"/>
    <path d="M96 0 C 120 14 150 14 176 4" stroke-width="1.1"/>
    <path d="M0 96 C 14 120 14 150 4 176" stroke-width="1.1"/>
    ${leaf(118, 9, 26, -38, stroke, "none")}${leaf(146, 11, 22, -20, stroke, "none")}
    ${leaf(9, 118, 26, 128, stroke, "none")}${leaf(11, 146, 22, 110, stroke, "none")}
  </g>
  <path d="M36 36 l 9 -9 l 9 9 l -9 9 z" fill="${stroke}"/>
  <circle cx="88" cy="4" r="3" fill="${stroke}"/><circle cx="4" cy="88" r="3" fill="${stroke}"/>`;
}

function art({ p, rng }: RenderCtx) {
  const water = 1252;
  // leaf() writes fill="..." verbatim, so this sneaks in a fill-opacity too
  const leafFill = `${p.accent}" fill-opacity="0.3`;
  const left = mangrove(rng, 186 + rng() * 24, water, 214 + rng() * 26, p.accent, leafFill, 1.6);
  const right = mangrove(rng, 880 + rng() * 20, water, 196 + rng() * 26, p.accent, leafFill, 1.6);
  const trees = `${left}${right}`;
  const c = corner(p.accent);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <radialGradient id="g" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="${p.bg2}"/><stop offset="1" stop-color="${p.bg}"/></radialGradient>
      <pattern id="lat" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M22 14 l 8 8 l -8 8 l -8 -8 z" fill="none" stroke="${p.accent}" stroke-width="0.8"/></pattern>
      <clipPath id="in"><rect x="46" y="46" width="988" height="1258"/></clipPath>
    </defs>
    <rect width="1080" height="1350" fill="url(#g)"/>
    <rect x="46" y="46" width="988" height="1258" fill="url(#lat)" opacity="0.05"/>
    <g clip-path="url(#in)">
      <g opacity="0.62">${trees}</g>
      <g opacity="0.09" transform="translate(0 ${water * 2}) scale(1 -1)">${trees}</g>
      ${ripples(rng, 60, 1020, water + 6, 4, p.accent, 0.45)}
    </g>
    <rect x="32" y="32" width="1016" height="1286" fill="none" stroke="${p.accent}" stroke-width="2.5"/>
    <rect x="46" y="46" width="988" height="1258" fill="none" stroke="${p.accent}" stroke-opacity="0.6" stroke-width="1"/>
    <g transform="translate(58 58)">${c}</g>
    <g transform="translate(1022 58) scale(-1 1)">${c}</g>
    <g transform="translate(58 1292) scale(1 -1)" opacity="0.9">${c}</g>
    <g transform="translate(1022 1292) scale(-1 -1)" opacity="0.9">${c}</g>
  </svg>`;
}

/** House crest: a mangrove inside a double ring, flanked by leaf sprigs. */
function crest({ p, rng }: RenderCtx) {
  const s = p.accent;
  const tree = mangrove(rng, 180, 104, 64, s, s, 1.3);
  const sprig = (dir: 1 | -1) => {
    const x0 = 180 + dir * 76;
    const pts: string[] = [`<path d="M${x0} 104 C ${x0 + dir * 40} 96 ${x0 + dir * 70} 70 ${x0 + dir * 92} 40" fill="none" stroke="${s}" stroke-width="1.4"/>`];
    for (let i = 0; i < 5; i++) {
      const t = 0.15 + i * 0.18;
      const x = x0 + dir * (40 * t * 2.2);
      const y = 104 - 64 * t * t - 4 * t;
      pts.push(leaf(x, y, 20, dir === 1 ? -70 + i * 8 : -110 - i * 8, s, "none"));
      pts.push(leaf(x, y, 18, dir === 1 ? 10 - i * 12 : 170 + i * 12, s, "none"));
    }
    return pts.join("");
  };
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="156">
    <defs><clipPath id="c"><circle cx="180" cy="78" r="56"/></clipPath></defs>
    <circle cx="180" cy="78" r="66" fill="none" stroke="${s}" stroke-width="2"/>
    <circle cx="180" cy="78" r="58" fill="none" stroke="${s}" stroke-width="0.8"/>
    <g clip-path="url(#c)">${tree}${ripples(rng, 120, 240, 110, 2, s, 0.8)}</g>
    <path d="M180 4 l 5 5 l -5 5 l -5 -5 z M180 142 l 5 5 l -5 5 l -5 -5 z" fill="${s}"/>
    ${sprig(1)}${sprig(-1)}
  </svg>`);
}

function Diamond({ size, color }: { size: number; color: string }) {
  return <div style={{ display: "flex", width: size, height: size, background: color, transform: "rotate(45deg)" }} />;
}

function render(ctx: RenderCtx) {
  const { data, p, when } = ctx;
  const title = truncate(data.title, 60);
  const size = fitSize(title, { width: 820, maxLines: 3, max: 150, min: 58, k: 0.56 });
  const tagline = truncate(data.tagline, 60);
  const venue = truncate(ctx.where, 80);
  const whereW = ctx.qr ? 320 : 400;
  const vSize = fitSize(venue, { width: whereW, maxLines: 3, max: 40, min: 26, k: 0.48 });
  const label = { display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 16, letterSpacing: 5, color: p.accent } as const;
  const vrule = <div style={{ display: "flex", width: 1.5, height: 150, background: p.accent, opacity: 0.6, margin: "0 38px" }} />;
  return (
    <Frame bg={p.bg}>
      <Art svg={art(ctx)} />
      <Grain opacity={0.12} />
      <Layer style={{ padding: "84px 110px 112px", alignItems: "center" }}>
        { }
        <img alt="" src={crest(ctx)} width={360} height={156} style={{ flexShrink: 0 }} />
        <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 18, letterSpacing: 6, color: p.accent, marginTop: 16 }}>
          {collabLine(data.houses).toUpperCase()}
        </div>
        <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 14, letterSpacing: 5, color: p.muted, marginTop: 8 }}>IIT MADRAS · BS DEGREE</div>
        <Spacer />
        {tagline ? (
          <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontWeight: 600, fontSize: 44, color: p.muted, marginBottom: 8, textAlign: "center", maxWidth: 860, wordBreak: "break-word" }}>
            {tagline}
          </div>
        ) : null}
        <div style={{ display: "flex", justifyContent: "center", fontFamily: "Playfair", fontWeight: 700, fontSize: size, lineHeight: 1.04, color: p.ink, textAlign: "center", maxWidth: 860, wordBreak: "break-word" }}>
          {title}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "30px 0 30px" }}>
          <div style={{ display: "flex", width: 110, height: 1.5, background: p.accent }} />
          <Diamond size={7} color={p.accent} />
          <Diamond size={11} color={p.accent} />
          <Diamond size={7} color={p.accent} />
          <div style={{ display: "flex", width: 110, height: 1.5, background: p.accent }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 200, flexShrink: 0 }}>
            <div style={label}>{when.weekdayLong.toUpperCase()}</div>
            <div style={{ display: "flex", fontFamily: "Playfair", fontStyle: "italic", fontWeight: 700, fontSize: 92, lineHeight: 1.3, color: p.ink }}>{when.day}</div>
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 700, fontSize: 20, letterSpacing: 5, color: p.ink }}>{`${when.month} ${when.year}`}</div>
          </div>
          {vrule}
          <div style={{ display: "flex", flexDirection: "column", width: whereW, flexShrink: 0, gap: 6 }}>
            <div style={label}>{data.mode === "online" ? "JOIN ONLINE" : "THE VENUE"}</div>
            <div style={{ display: "flex", fontFamily: "Cormorant", fontWeight: 700, fontSize: vSize, lineHeight: 1.1, color: p.ink, maxWidth: whereW, wordBreak: "break-word" }}>{venue}</div>
            {ctx.linkLabel ? (
              <div style={{ display: "flex", fontFamily: "Mono", fontSize: 16, color: p.muted }}>{truncate(ctx.linkLabel, 32)}</div>
            ) : null}
            <div style={{ display: "flex", fontFamily: "Grotesk", fontWeight: 500, fontSize: 22, color: p.ink, marginTop: 6 }}>{when.timeRange}</div>
          </div>
          {ctx.qr ? vrule : null}
          <Qr ctx={ctx} ink={p.muted} size={116} label="Scan" />
        </div>
        {data.highlights.length ? (
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: 30, rowGap: 8, marginTop: 34, maxWidth: 860 }}>
            {data.highlights.slice(0, 4).map((h) => (
              <div key={h} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Diamond size={8} color={p.accent} />
                <div style={{ display: "flex", fontFamily: "Cormorant", fontStyle: "italic", fontWeight: 600, fontSize: 32, color: p.ink, maxWidth: 400, wordBreak: "break-word" }}>{truncate(h, 26)}</div>
              </div>
            ))}
          </div>
        ) : null}
        <Spacer grow={0.7} />
        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <Logos houses={data.houses} plate="#FFFDF8" ring={p.accent} max={74} gap={16} width={740} />
        </div>
      </Layer>
    </Frame>
  );
}

export const mangroveRoyal: Template = {
  id: "mangrove-royal",
  name: "Mangrove Royal",
  eventTypes: "all",
  modes: ["online", "offline"],
  moods: ["house", "pichavaram", "celebration", "felicitation", "ceremony", "formal", "award", "festival"],
  palettes: [
    { id: "emerald-gilt", name: "Emerald Gilt", bg: "#03211A", bg2: "#0C4434", ink: "#F6EEDB", muted: "#BCD2C2", accent: "#CBA65E", accent2: "#E9D39B" },
    { id: "ivory-court", name: "Ivory Court", bg: "#F3ECDC", bg2: "#FBF6EA", ink: "#0B3A2C", muted: "#4F6C5E", accent: "#9C7A2E", accent2: "#0E5C4A" },
    { id: "festive-maroon", name: "Festive Maroon", bg: "#24070F", bg2: "#521526", ink: "#F8EDDC", muted: "#D9BBAA", accent: "#D7B56C", accent2: "#3F8F6E" },
  ],
  render,
};
