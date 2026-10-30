import { fail, guard } from "@/lib/api";
import { canView, getRequest, getThumb, posterFilename, renderRequest } from "@/lib/pipeline";

export const maxDuration = 60;

/**
 * Full-resolution PNG, re-rendered from the stored seed. ?download=1 forces a
 * file save; ?thumb=1 returns the stored 360px JPEG.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (user instanceof Response) return user;
  const { id } = await params;
  const row = await getRequest(id);
  if (!row || !canView(user, row)) return fail(404, "Poster not found.");
  const params2 = new URL(req.url).searchParams;
  if (params2.has("thumb")) {
    const thumb = await getThumb(id);
    if (thumb) {
      return new Response(new Uint8Array(thumb), {
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=86400" },
      });
    }
  }
  const { png } = await renderRequest(row);
  const download = params2.has("download");
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${posterFilename(row)}"`,
    },
  });
}
