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
    <Card className="bg-white/70 p-5 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <p className="truncate text-[13px] font-medium text-muted">{label}</p>
      </div>
      <p
        className="mt-4 font-display text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink/25"
        aria-hidden="true"
      >
        —
      </p>
      <p className="mt-2 text-xs text-subtle">No data yet</p>
    </Card>
  );
}
