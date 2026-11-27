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
  /** Renders inside a shared strip rather than as a standalone card. */
  bare?: boolean;
};

/** A real number from Firestore, with an optional route to act on it. */
export function MetricCard({ label, value, hint, icon: Icon, href, bare }: MetricCardProps) {
  const content = (
    <>
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
    </>
  );

  if (bare) {
    if (!href) return <div className="h-full px-5 py-5">{content}</div>;
    return (
      <Link href={href} className="group block h-full px-5 py-5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
        {content}
      </Link>
    );
  }

  if (!href) {
    return (
      <Card className="h-full p-4 transition-all duration-200 sm:p-5">
        {content}
      </Card>
    );
  }

  return (
    <Link href={href} className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
      <Card className="h-full p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-brand/25 group-hover:shadow-raised sm:p-5">
        {content}
      </Card>
    </Link>
  );
}
