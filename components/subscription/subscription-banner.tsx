"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { formatPrice, getPlan } from "@/lib/subscription/catalog";

/** Shown when the authoritative server says privileged writes are unavailable. */
export function SubscriptionBanner() {
  const { state } = useSubscription();
  if (!state || state.entitlement.canWrite) return null;

  const plan = getPlan("starter");
  return (
    <div
      role="status"
      className="mx-4 mt-4 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-[12px] text-ink sm:mx-8 lg:mx-12"
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <AlertCircle className="size-4 shrink-0 text-danger" aria-hidden="true" />
        <span className="font-semibold">{state.entitlement.reason}</span>
        <span className="text-muted">
          Your inquiries, follow-ups, communications and reports are preserved. Choose a plan to continue creating records.
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <span className="font-medium text-ink">{plan.name} · {formatPrice(plan)}</span>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 font-semibold text-brand hover:text-brand-strong"
        >
          Manage subscription <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
        <span className="text-subtle">Payment processing is not available yet.</span>
      </div>
    </div>
  );
}
