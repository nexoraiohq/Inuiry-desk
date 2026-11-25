import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  icon: LucideIcon;
};

/**
 * Placeholder metric. No value is invented — the card states plainly that
 * data is not connected yet.
 */
export function MetricCard({ label, icon: Icon }: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-muted">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-subtle">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p
        className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink/25"
        aria-hidden="true"
      >
        —
      </p>
      <p className="mt-1 text-xs text-subtle">No data yet</p>
    </Card>
  );
}
