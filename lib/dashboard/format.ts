/** Display formatting that respects the workspace timezone when configured. */
import { formatDateInZone, formatInZone } from "@/lib/datetime/zone";

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};
const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};


export function formatDate(date: Date): string {
  return formatDateInZone(date);
}

export function formatDateTime(date: Date): string {
  return formatInZone(date, DATE_TIME_OPTIONS);
}

export function formatTime(date: Date): string {
  return formatInZone(date, TIME_OPTIONS);
}

export function formatToday(date: Date): string {
  const weekday = formatInZone(date, { weekday: "long" });
  return `${weekday}, ${formatDateInZone(date)}`;
}

/** Short relative label with an exact value available through <time dateTime>. */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const absMinutes = Math.round(Math.abs(diffMs) / 60_000);
  const suffix = diffMs >= 0 ? "in " : "";

  if (absMinutes < 1) return "just now";
  if (absMinutes < 60) return `${suffix}${absMinutes}m`;

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return `${suffix}${absHours}h`;

  const absDays = Math.round(absHours / 24);
  if (absDays <= 7) return `${suffix}${absDays}d`;

  return formatDate(date);
}

export function isOverdue(date: Date, now: Date = new Date()): boolean {
  return date.getTime() < now.getTime();
}

export function humanize(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
