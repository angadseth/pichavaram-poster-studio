import { Resvg } from "@resvg/resvg-js";
import QRCode from "qrcode";
import satori from "satori";
import sharp from "sharp";
import { loadFonts } from "./fonts";
import { getTemplate } from "./registry";
import type { Choice, PosterData, RenderCtx } from "./types";
import { POSTER_H, POSTER_W } from "./types";
import { describeWhen, linkLabel, mulberry32, svgUri } from "./util";

export async function buildCtx(data: PosterData, choice: Choice): Promise<RenderCtx> {
  const tpl = getTemplate(choice.templateId);
  const p = tpl.palettes.find((x) => x.id === choice.paletteId) ?? tpl.palettes[0];
  const qr =
    data.mode === "online" && data.meetLink
      ? svgUri(
          await QRCode.toString(data.meetLink, {
            type: "svg",
            margin: 0,
            errorCorrectionLevel: "M",
            color: { dark: "#111111", light: "#FFFDF8" },
          }),
        )
      : undefined;
  return {
    data,
    p,
    rng: mulberry32(choice.seed),
    qr,
    when: describeWhen(data),
    where: data.mode === "online" ? "Google Meet" : data.venue?.trim() || "Venue to be announced",
    linkLabel: data.mode === "online" ? linkLabel(data.meetLink) : undefined,
  };
}

export async function renderSvg(data: PosterData, choice: Choice): Promise<string> {
  const [fonts, ctx] = await Promise.all([loadFonts(), buildCtx(data, choice)]);
  const element = getTemplate(choice.templateId).render(ctx);
  return satori(element, {
    width: POSTER_W,
    height: POSTER_H,
    fonts: fonts.map(({ name, data: buf, weight, style }) => ({ name, data: buf, weight, style })),
  });
}

export type RenderOptions = { width?: number; format?: "png" | "jpeg" };

export async function renderPoster(
  data: PosterData,
  choice: Choice,
  opts: RenderOptions = {},
): Promise<{ png: Buffer; ms: number; mime: string }> {
  const t0 = performance.now();
  const svg = await renderSvg(data, choice);
  const raster = new Resvg(svg, {
    fitTo: { mode: "width", value: opts.width ?? POSTER_W },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  const png =
    opts.format === "jpeg"
      ? await sharp(raster).jpeg({ quality: 86, mozjpeg: true }).toBuffer()
      : Buffer.from(raster);
  return { png, ms: Math.round(performance.now() - t0), mime: opts.format === "jpeg" ? "image/jpeg" : "image/png" };
}
