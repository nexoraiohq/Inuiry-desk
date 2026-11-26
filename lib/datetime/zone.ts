/** Workspace timezone helpers. Stored values remain absolute Timestamps. */

let workspaceTimeZone: string | undefined;

export function setWorkspaceTimeZone(timezone?: string): void {
  workspaceTimeZone = timezone || undefined;
}

export function getWorkspaceTimeZone(): string | undefined {
  return workspaceTimeZone;
}

export function formatInZone(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(undefined, {
    ...options,
    ...(workspaceTimeZone ? { timeZone: workspaceTimeZone } : {}),
  }).format(date);
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

export function zonedParts(date: Date): Parts {
  const parts = new Intl.DateTimeFormat("en-US", {
    ...(workspaceTimeZone ? { timeZone: workspaceTimeZone } : {}),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

/** Converts a wall-clock date/time in the workspace timezone to an absolute Date. */
export function zonedDateTimeToDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  if (!workspaceTimeZone) return new Date(year, month - 1, day, hour, minute);
  let utc = Date.UTC(year, month - 1, day, hour, minute);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = zonedParts(new Date(utc));
    const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
    const diff = asUtc - utc;
    if (diff === 0) break;
    utc -= diff;
  }
  return new Date(utc);
}

export function toDateInputInZone(date: Date): string {
  const parts = zonedParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function toTimeInputInZone(date: Date): string {
  const parts = zonedParts(date);
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

export function startOfDayInZone(date: Date): Date {
  if (!workspaceTimeZone) return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const parts = zonedParts(date);
  return zonedDateTimeToDate(parts.year, parts.month, parts.day, 0, 0);
}

export function addDaysInZone(date: Date, days: number): Date {
  if (!workspaceTimeZone) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
  const parts = zonedParts(date);
  // Add days on the UTC calendar at noon, then rebuild the wall clock in the
  // workspace zone. Midnight arithmetic can repeat/skip days around DST.
  const anchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return zonedDateTimeToDate(
    anchor.getUTCFullYear(),
    anchor.getUTCMonth() + 1,
    anchor.getUTCDate(),
    parts.hour,
    parts.minute
  );
}

export function dayKeyInZone(date: Date): string {
  const parts = zonedParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}
