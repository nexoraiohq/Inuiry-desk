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
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-brand-soft text-brand">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink/80">{label}</p>
          <p
            className="mt-1 font-display text-2xl font-bold tracking-[-0.02em] text-ink/30"
            aria-hidden="true"
          >
            —
          </p>
          <p className="mt-0.5 text-xs font-medium text-subtle">No data yet</p>
        </div>
      </div>
    </Card>
  );
}
