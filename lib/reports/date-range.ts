/** Local-timezone date-range boundaries for reporting. */
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
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function parseLocalDate(input: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return null;
  }
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
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { key: preset, label: "This month", start, end };
  }

  if (preset === "previousMonth") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 1);
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
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function eachDay(range: DateRange): Date[] {
  const days: Date[] = [];
  for (let cursor = new Date(range.start); cursor.getTime() < range.end.getTime(); cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }
  return days;
}
