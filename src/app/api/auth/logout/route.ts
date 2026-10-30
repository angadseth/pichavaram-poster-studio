import { json } from "@/lib/api";
import { endSession } from "@/lib/session";

export async function POST() {
  await endSession();
  return json({ ok: true });
}
