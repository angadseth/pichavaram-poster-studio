import { appUrl, fail, guard, json } from "@/lib/api";
import { canDeliver, deliver, getRequest, MAX_POSTER_BYTES } from "@/lib/requests";

export const maxDuration = 60;

/** The assigned designer (or an admin) uploads the finished poster; it is emailed to the RC. Form field: "poster". */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await guard();
  if (user instanceof Response) return user;
  const { id } = await params;
  const r = await getRequest(id);
  if (!r || !canDeliver(user, r)) return fail(404, "Request not found.");
  const form = await req.formData().catch(() => null);
  const file = form?.get("poster");
  if (!(file instanceof File) || file.size === 0) return fail(400, "Choose the poster image to upload.");
  if (file.size > MAX_POSTER_BYTES) return fail(413, "The image is over 4 MB. Export it smaller and try again.");
  if (!file.type.startsWith("image/")) return fail(400, "Upload an image (PNG or JPG).");
  try {
    const { mailed } = await deliver(r, Buffer.from(await file.arrayBuffer()), appUrl(req));
    return json({ ok: true, mailed });
  } catch (err) {
    console.error(`[upload] request ${id}:`, err);
    return fail(400, "That file couldn't be read as an image. Upload a PNG or JPG.");
  }
}
