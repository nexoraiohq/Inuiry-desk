/** Local-timezone date-range boundaries for reporting. */
import {
  addDaysInZone,
  dayKeyInZone,
  formatInZone,
  startOfDayInZone,
  zonedDateTimeToDate,
  zonedParts,
} from "@/lib/datetime/zone";
export type RangePreset =
  | "7d"
  | "30d"
  | "90d"
  | "thisMonth"
  | "previousMonth"
  | "custom";

export type DateRange = {
  key: RangePreset;
  label: string;
  start: Date;
  /** Exclusive upper bound — prevents double-counting at midnight. */
  end: Date;
};

function startOfDay(date: Date): Date {
  return startOfDayInZone(date);
}

function addDays(date: Date, days: number): Date {
  return addDaysInZone(date, days);
}

export function parseLocalDate(input: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = zonedDateTimeToDate(year, month, day, 0, 0);
  const parts = zonedParts(date);
  if (parts.year !== year || parts.month !== month || parts.day !== day) return null;
  return date;
}

export function resolveDateRange(
  preset: RangePreset,
  customStart: string,
  customEnd: string,
  now: Date = new Date()
): DateRange | null {
  const today = startOfDay(now);

  if (preset === "custom") {
    const start = parseLocalDate(customStart);
    const endExclusive = parseLocalDate(customEnd);
    if (!start || !endExclusive || start.getTime() > endExclusive.getTime()) return null;
    return {
      key: preset,
      label: `${formatShort(start)} – ${formatShort(endExclusive)}`,
      start,
      end: addDays(endExclusive, 1),
    };
  }

  if (preset === "thisMonth") {
    const parts = zonedParts(now);
    const start = zonedDateTimeToDate(parts.year, parts.month, 1, 0, 0);
    const end = zonedDateTimeToDate(parts.year, parts.month + 1, 1, 0, 0);
    return { key: preset, label: "This month", start, end };
  }

  if (preset === "previousMonth") {
    const parts = zonedParts(now);
    const start = zonedDateTimeToDate(parts.year, parts.month - 1, 1, 0, 0);
    const end = zonedDateTimeToDate(parts.year, parts.month, 1, 0, 0);
    return { key: preset, label: "Previous month", start, end };
  }

  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return {
    key: preset,
    label: `Last ${days} days`,
    start: addDays(today, -(days - 1)),
    end: addDays(today, 1),
  };
}

export function formatShort(date: Date): string {
  return formatInZone(date, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function dayKey(date: Date): string {
  return dayKeyInZone(date);
}

export function eachDay(range: DateRange): Date[] {
  const days: Date[] = [];
  for (let cursor = new Date(range.start); cursor.getTime() < range.end.getTime(); cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }
  return days;
}
