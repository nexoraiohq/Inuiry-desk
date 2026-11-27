"use client";

import { AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

export function DashboardError({
  message,
  onRetry,
  title = "We couldn't load your overview",
}: {
  message: string;
  onRetry: () => void;
  title?: string;
}) {
  return (
    <Card className="bg-surface p-5 shadow-card sm:p-8" role="alert">
      <div className="flex max-w-lg flex-col items-start gap-3">
        <span className="grid size-9 place-items-center rounded-xl bg-danger-soft text-danger">
          <AlertCircle className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{message}</p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className={buttonClasses("secondary", "md", "h-9")}
        >
          Try again
        </button>
      </div>
    </Card>
  );
}
