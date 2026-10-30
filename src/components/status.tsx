export function Status({ status }: { status: string }) {
  if (status === "sent") return <span className="chip chip-ok">Emailed</span>;
  if (status === "failed") return <span className="chip chip-bad">Email failed</span>;
  return <span className="chip chip-wait">Designing</span>;
}

export function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function fmtStamp(ms: number) {
  return new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });
}
