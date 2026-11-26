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
          <div className="h-1.5 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function TrendBars({ points, emptyLabel = "No data in this range" }: { points: TrendPoint[]; emptyLabel?: string }) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const active = points.filter((point) => point.value > 0).length > 0;
  if (!active) return <p className="text-[12px] text-subtle">{emptyLabel}</p>;

  return (
    <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Daily trend">
      {points.map((point, index) => (
        <div key={`${point.key}-${index}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
          <div
            className="w-full max-w-8 rounded-t bg-brand/80"
            style={{ height: `${(point.value / max) * 100}%` }}
            title={`${point.label}: ${point.value}`}
          />
          {index % Math.max(1, Math.ceil(points.length / 6)) === 0 ? (
            <span className="text-[9px] text-subtle">{point.label}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
