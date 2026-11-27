import type { NamedValue, TrendPoint } from "@/lib/reports/types";

export function BarList({ values, emptyLabel = "No data" }: { values: NamedValue[]; emptyLabel?: string }) {
  if (values.length === 0) {
    return <p className="text-[12px] text-subtle">{emptyLabel}</p>;
  }
  const max = Math.max(...values.map((item) => item.value), 1);
  return (
    <ul className="space-y-2.5">
      {values.map((item, index) => (
        <li key={`${item.name}-${index}`}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="truncate text-[12px] text-muted">{item.name.replaceAll("_", " ")}</span>
            <span className="text-[12px] font-semibold tabular-nums text-ink">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Even integer steps; every gridline is a real value, never a rounded guess. */
function axisConfig(peak: number): { ticks: number[]; top: number } {
  const step = peak <= 4 ? 1 : peak <= 8 ? 2 : peak <= 20 ? 5 : peak <= 40 ? 10 : Math.ceil(peak / 40) * 10;
  const top = Math.ceil(peak / step) * step;
  const ticks: number[] = [];
  for (let value = top; value >= 0; value -= step) ticks.push(value);
  return { ticks, top };
}

/** "Oct 28" stays a readable date; monthly "Oct 26" stays as-is. */
function tickLabel(label: string): string {
  const daily = /^([A-Za-z]{3})\s+(\d{1,2})$/.exec(label);
  return daily ? `${daily[1]} ${daily[2]}` : label;
}

/** A handful of real dates, evenly spread, instead of one cramped label per bar. */
function labelledPoints(points: TrendPoint[]): Array<{ index: number; label: string }> {
  if (points.length <= 6) return points.map((point, index) => ({ index, label: tickLabel(point.label) }));
  const count = 5;
  return Array.from({ length: count }, (_, slot) => {
    const index = Math.round((slot * (points.length - 1)) / (count - 1));
    return { index, label: tickLabel(points[index].label) };
  });
}

/**
 * Wide bars, real values printed on each bar, quiet gridlines and spaced date
 * ticks. No invented axis numbers.
 */
export function TrendBars({
  points,
  emptyLabel = "No data in this range",
  seriesLabel = "Count",
}: {
  points: TrendPoint[];
  emptyLabel?: string;
  seriesLabel?: string;
}) {
  const peak = Math.max(...points.map((point) => point.value), 0);
  if (peak === 0) return <p className="text-[12px] text-subtle">{emptyLabel}</p>;

  const { ticks, top } = axisConfig(peak);
  const labels = labelledPoints(points);

  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-[11px] font-medium text-muted">{seriesLabel}</p>
      <div className="flex min-h-44 flex-1 gap-3">
        <div className="flex shrink-0 flex-col justify-between text-right text-[10px] tabular-nums text-subtle" aria-hidden="true">
          {ticks.map((tick, index) => <span key={index}>{tick}</span>)}
        </div>
        <div className="relative min-w-0 flex-1">
          <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
            {ticks.map((_, index) => <div key={index} className="border-t border-line" />)}
          </div>
          <div className="relative flex h-full min-w-0 items-end gap-0.5" role="img" aria-label={`${seriesLabel} over time, peak ${peak}`}>
            {points.map((point, index) => (
              <div key={`${point.key}-${index}`} className="group relative flex h-full min-w-0 flex-1 items-end justify-center">
                <div
                  className="w-full rounded-t bg-brand transition-colors group-hover:bg-brand-strong"
                  style={{ height: `${(point.value / top) * 100}%` }}
                  title={`${point.label}: ${point.value} ${seriesLabel.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex justify-between gap-2 pl-8">
        {labels.map(({ index, label }) => (
          <span key={index} className="text-[10px] whitespace-nowrap text-subtle">{label}</span>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-muted">
        <span className="size-2 rounded-sm bg-brand" aria-hidden="true" /> {seriesLabel}
      </div>
    </div>
  );
}
