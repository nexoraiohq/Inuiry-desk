/** Date/time helpers. Stored values remain absolute Firestore Timestamps. */
import {
  addDaysInZone,
  startOfDayInZone,
  toDateInputInZone,
  toTimeInputInZone,
  zonedDateTimeToDate,
  zonedParts,
} from "@/lib/datetime/zone";

export function combineLocalDateTime(date: string, time: string): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;
  const [, y, m, d] = dateMatch;
  const [, hh, mm] = timeMatch;
  const result = zonedDateTimeToDate(Number(y), Number(m), Number(d), Number(hh), Number(mm));
  const parts = zonedParts(result);
  if (parts.year !== Number(y) || parts.month !== Number(m) || parts.day !== Number(d)) {
    return null;
  }
  return result;
}

export function toDateInput(date: Date): string {
  return toDateInputInZone(date);
}

export function toTimeInput(date: Date): string {
  return toTimeInputInZone(date);
}

export type FollowUpGroup = "overdue" | "today" | "upcoming" | "completed" | "cancelled";

export function groupFor(
  status: "pending" | "completed" | "cancelled",
  dueAt: Date,
  now: Date = new Date()
): FollowUpGroup {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  const startToday = startOfDayInZone(now);
  const endToday = addDaysInZone(startToday, 1);
  if (dueAt.getTime() < now.getTime()) return "overdue";
  if (dueAt.getTime() < endToday.getTime()) return "today";
  return "upcoming";
}

export function defaultDueDateTime(
  intervalDays = 1,
  defaultTime = "10:00"
): { date: string; time: string } {
  const match = /^(\d{2}):(\d{2})$/.exec(defaultTime);
  const base = new Date();
  const target = addDaysInZone(base, intervalDays);
  if (!match) return { date: toDateInput(target), time: toTimeInput(target) };
  const parts = zonedParts(target);
  const concrete = zonedDateTimeToDate(
    parts.year,
    parts.month,
    parts.day,
    Number(match[1]),
    Number(match[2])
  );
  return { date: toDateInput(concrete), time: toTimeInput(concrete) };
}
