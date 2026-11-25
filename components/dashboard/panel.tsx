import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

type PanelProps = {
  title: string;
  description: string;
  meta?: string;
  children: ReactNode;
};

/** Shared card shell for dashboard lists. */
export function Panel({ title, description, meta, children }: PanelProps) {
  return (
    <Card className="overflow-hidden bg-canvas/80 shadow-card">
      <div className="flex flex-col gap-2 border-b border-line px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h2 className="font-display text-[14px] font-semibold tracking-[-0.01em] text-ink sm:text-[15px]">
            {title}
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted sm:text-[13px]">
            {description}
          </p>
        </div>
        {meta ? <span className="text-[10px] text-subtle sm:text-[11px]">{meta}</span> : null}
      </div>
      {children}
    </Card>
  );
}
