import type { Status as S } from "@/lib/requests";

const LABEL: Record<S, string> = { new: "Received", assigned: "In design", delivered: "Delivered" };
const TONE: Record<S, string> = { new: "chip-wait", assigned: "chip-wait", delivered: "chip-ok" };

export function Status({ status }: { status: S }) {
  return <span className={`chip ${TONE[status]}`}>{LABEL[status]}</span>;
}
