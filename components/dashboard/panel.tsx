import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type PanelProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  meta?: string;
  action?: { href: string; label: string };
  children: ReactNode;
};

/** Shared card shell for dashboard lists. */
export function Panel({ title, description, icon: Icon, meta, action, children }: PanelProps) {
  return (
    <Card className="overflow-hidden bg-surface shadow-card">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-brand">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-display text-[16px] font-semibold tracking-[-0.01em] text-ink">
              {title}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-muted sm:text-[14px]">
              {description}
            </p>
          </div>
        </div>
        {action || meta ? (
          <div className="flex shrink-0 items-center gap-3">
            {action ? (
              <Link
                href={action.href}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-brand hover:text-brand-strong"
              >
                {action.label}
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
            {meta ? <span className="text-[12px] text-subtle">{meta}</span> : null}
          </div>
        ) : null}
      </div>
      {children}
    </Card>
  );
}
