/** Local-time helpers. Stored values are absolute Firestore Timestamps. */
export function combineLocalDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const [, y, m, d] = dateMatch;
  const [, hh, mm] = timeMatch;
  const result = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
  if (
    result.getFullYear() !== Number(y) ||
    result.getMonth() !== Number(m) - 1 ||
    result.getDate() !== Number(d)
  ) {
    return null;
  }
  return result;
}

export function toDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeInput(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export type FollowUpGroup = "overdue" | "today" | "upcoming" | "completed" | "cancelled";

export function groupFor(
  status: "pending" | "completed" | "cancelled",
  dueAt: Date,
  now: Date = new Date()
): FollowUpGroup {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);
  if (dueAt.getTime() < now.getTime()) return "overdue";
  if (dueAt.getTime() < endToday.getTime()) return "today";
  return "upcoming";
}

export function defaultDueDateTime(): { date: string; time: string } {
  const now = new Date();
  return {
    date: toDateInput(now),
    time: toTimeInput(new Date(now.getTime() + 60 * 60 * 1000)),
  };
}
