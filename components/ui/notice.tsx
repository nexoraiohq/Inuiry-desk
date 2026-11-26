"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/cn";

type NoticeProps = {
  tone: "success" | "danger";
  message: string;
  onDismiss?: () => void;
};

/** Compact success/error notification used after writes. */
export function Notice({ tone, message, onDismiss }: NoticeProps) {
  const success = tone === "success";
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={success ? "status" : "alert"}
      className={cn(
        "mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-medium",
        success
          ? "border-success/20 bg-success-soft text-success"
          : "border-danger/20 bg-danger-soft text-danger"
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1">{message}</span>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
