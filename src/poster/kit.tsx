/* Shared building blocks for poster templates.
 * Satori rule: any element with more than one child needs display:flex. */
import type { CSSProperties, ReactNode } from "react";
import type { PosterHouse, RenderCtx } from "./types";
import { POSTER_H, POSTER_W } from "./types";
import { grainSvg, svgUri } from "./util";

export function Frame({ bg, children, style }: { bg: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: POSTER_W,
        height: POSTER_H,
        display: "flex",
        position: "relative",
        background: bg,
        overflow: "hidden",
        fontFamily: "Manrope",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Full-bleed SVG art layer. */
export function Art({ svg, style }: { svg: string; style?: CSSProperties }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      alt=""
      src={svgUri(svg)}
      width={POSTER_W}
      height={POSTER_H}
      style={{ position: "absolute", left: 0, top: 0, ...style }}
    />
  );
}

export function Grain({ opacity = 0.16 }: { opacity?: number }) {
  return <Art svg={grainSvg(POSTER_W, POSTER_H, opacity)} />;
}

/** Content column that sits above the art layers. */
export function Layer({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        // inset instead of width/height: satori adds padding outside an explicit size
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Logo plates for Pichavaram + collaborating houses; shrinks as count grows. */
export function Logos({
  houses,
  plate,
  ring,
  max = 92,
  gap = 18,
  width = 900,
  justify = "center",
}: {
  houses: PosterHouse[];
  plate: string;
  ring: string;
  max?: number;
  gap?: number;
  width?: number;
  justify?: "center" | "flex-start" | "flex-end";
}) {
  const n = houses.length;
  const perRow = n <= 6 ? n : Math.ceil(n / 2);
  const size = Math.max(54, Math.min(max, Math.floor((width - gap * (perRow - 1)) / perRow)));
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: justify, gap, width }}>
      {houses.map((h) => (
        <div
          key={h.name}
          style={{
            width: size,
            height: size,
            borderRadius: size,
            background: plate,
            border: `2px solid ${ring}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" src={h.logo} width={size - 14} height={size - 14} style={{ objectFit: "contain" }} />
        </div>
      ))}
    </div>
  );
}

export function collabLine(houses: PosterHouse[]): string {
  if (houses.length <= 1) return "Pichavaram House presents";
  if (houses.length <= 3) return houses.map((h) => h.name.replace(/ House$/, "")).join(" × ");
  return `Pichavaram × ${houses.length - 1} houses`;
}

/** QR code on a light plate (scanners need dark-on-light). */
export function Qr({ ctx, size = 150, label = "Scan to join", ink }: { ctx: RenderCtx; size?: number; label?: string; ink: string }) {
  if (!ctx.qr) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex", padding: 12, background: "#FFFDF8", borderRadius: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" src={ctx.qr} width={size} height={size} />
      </div>
      <div style={{ display: "flex", fontFamily: "Grotesk", fontSize: 18, letterSpacing: 3, color: ink, textTransform: "uppercase" }}>
        {label}
      </div>
    </div>
  );
}

export function Spacer({ grow = 1 }: { grow?: number }) {
  return <div style={{ display: "flex", flexGrow: grow }} />;
}

export function Highlights({
  items,
  color,
  dot,
  font = "Manrope",
  size = 26,
}: {
  items: string[];
  color: string;
  dot: string;
  font?: string;
  size?: number;
}) {
  if (items.length === 0) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
      {items.slice(0, 4).map((t) => (
        <div
          key={t}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            borderRadius: 999,
            border: `1.5px solid ${dot}`,
            color,
            fontFamily: font,
            fontWeight: 600,
            fontSize: size,
          }}
        >
          <div style={{ display: "flex", width: 9, height: 9, borderRadius: 9, background: dot }} />
          {t}
        </div>
      ))}
    </div>
  );
}
