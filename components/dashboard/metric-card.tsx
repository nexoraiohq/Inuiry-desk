import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type MetricCardProps = {
  label: string;
  value: number;
  hint: string;
  icon: LucideIcon;
  /** When provided the whole card becomes a shortcut to the relevant list. */
  href?: string;
};

/** A real number from Firestore, with an optional route to act on it. */
export function MetricCard({ label, value, hint, icon: Icon, href }: MetricCardProps) {
  const body = (
    <Card className="h-full bg-canvas/80 p-4 shadow-card transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-brand/25 group-hover:shadow-raised sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[13px] font-medium text-muted sm:text-[14px]">{label}</p>
        <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand sm:size-9">
          <Icon className="size-[17px] sm:size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 font-display text-[30px] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums sm:mt-4 sm:text-[34px]">
        {value.toLocaleString()}
      </p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-[12px] text-subtle sm:text-[13px]">{hint}</p>
        {href ? (
          <span className="text-[11px] font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
            Open
          </span>
        ) : null}
      </div>
    </Card>
  );

  if (!href) return body;

  return (
    <Link href={href} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
      {body}
    </Link>
  );
}
