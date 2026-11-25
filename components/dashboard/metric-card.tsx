import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  icon: LucideIcon;
};

/** Placeholder metric — no invented value, just our Phase 1 content. */
export function MetricCard({ label, icon: Icon }: MetricCardProps) {
  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <p className="min-w-0 truncate text-[12px] font-medium text-muted sm:text-[13px]">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand sm:size-9">
          <Icon className="size-[17px] sm:size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p
        className="mt-3 font-display text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink/50 sm:mt-4 sm:text-[30px]"
        aria-hidden="true"
      >
        —
      </p>
      <p className="mt-2 text-[10px] text-subtle sm:text-[11px]">No data yet</p>
    </Card>
  );
}
