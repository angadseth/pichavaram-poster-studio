import { fail, guard } from "@/lib/api";
import { canView, getPoster, getRequest, getThumb, posterFilename } from "@/lib/requests";

/** The uploaded poster. ?thumb=1 returns the 480px JPEG; ?download=1 forces a file save. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (user instanceof Response) return user;
  const { id } = await params;
  const row = await getRequest(id);
  if (!row || !canView(user, row)) return fail(404, "Poster not found.");
  const q = new URL(req.url).searchParams;
  if (q.has("thumb")) {
    const thumb = await getThumb(id);
    if (!thumb) return fail(404, "No poster yet.");
    return new Response(new Uint8Array(thumb), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=300" } });
  }
  const p = await getPoster(id);
  if (!p) return fail(404, "No poster yet.");
  return new Response(new Uint8Array(p.data), {
    headers: {
      "Content-Type": p.mime,
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": `${q.has("download") ? "attachment" : "inline"}; filename="${posterFilename(row, p.mime)}"`,
    },
  });
}
