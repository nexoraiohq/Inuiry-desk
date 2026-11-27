"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { availablePlans, formatPrice, getPlan } from "@/lib/subscription/catalog";
import { formatInZone } from "@/lib/datetime/zone";
import type { SubscriptionStatus } from "@/lib/subscription/types";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
  expired: "Expired",
  suspended: "Suspended",
  grandfathered: "Grandfathered",
};

function when(value: string | null): string {
  if (!value) return "—";
  return formatInZone(new Date(value), { dateStyle: "medium", timeStyle: "short" });
}

export function SubscriptionForm() {
  const { state, loading, error, refresh } = useSubscription();

  if (loading || !state) {
    return (
      <Card className="bg-canvas/80 p-4 shadow-card sm:p-6">
        <h2 className="font-display text-[15px] font-semibold text-ink">Subscription</h2>
        <p className="mt-3 text-[12px] text-muted">Loading subscription information…</p>
      </Card>
    );
  }

  const { entitlement, usage, subscription } = state;
  const plan = getPlan(entitlement.planId);
  const limitText = (limit: number | null) => (limit === null ? "Unlimited" : limit.toLocaleString());

  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ink">Subscription</h2>
          <p className="mt-1 text-[12px] text-muted">
            Plan, trial status and entitlements for this workspace.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className={buttonClasses("secondary", "sm")}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      {error ? <div className="mt-4"><Notice tone="danger" message={error} /></div> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3.5">
          <p className="text-[11px] font-medium text-subtle">Current plan</p>
          <p className="mt-1 font-display text-[16px] font-semibold text-ink">{plan.name}</p>
          <p className="mt-1 text-[11px] text-muted">{formatPrice(plan)}</p>
        </div>
        <div className="rounded-xl border border-line p-3.5">
          <p className="text-[11px] font-medium text-subtle">Status</p>
          <p className="mt-1 font-display text-[16px] font-semibold text-ink">
            {STATUS_LABELS[entitlement.status]}
          </p>
          <p className="mt-1 text-[11px] text-muted">{entitlement.reason}</p>
        </div>
      </div>

      {(subscription?.trialStartedAt || subscription?.trialEndsAt) ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium text-subtle">Trial started</p>
            <p className="mt-1 text-[12px] text-ink">{when(subscription?.trialStartedAt ?? null)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-subtle">Trial ends</p>
            <p className="mt-1 text-[12px] text-ink">{when(subscription?.trialEndsAt ?? null)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-subtle">Days remaining</p>
            <p className="mt-1 text-[12px] text-ink">
              {entitlement.daysRemaining === null ? "—" : entitlement.daysRemaining}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-[12px] font-semibold text-ink">Current entitlements</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {entitlement.features.map((feature) => (
            <span key={feature} className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted">
              {feature.replace(/([A-Z])/g, " $1")}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-[12px] font-semibold text-ink">Workspace usage</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <p className="text-[12px] text-muted">
            Active inquiries: <span className="font-semibold text-ink">{usage.activeInquiries}</span>
            <span className="text-subtle"> / {limitText(entitlement.limits.activeInquiries)}</span>
          </p>
          <p className="text-[12px] text-muted">
            Follow-ups: <span className="font-semibold text-ink">{usage.followUps}</span>
            <span className="text-subtle"> / {limitText(entitlement.limits.followUps)}</span>
          </p>
          <p className="text-[12px] text-muted">
            All inquiries: <span className="font-semibold text-ink">{usage.totalInquiries}</span>
          </p>
        </div>
        <p className="mt-2 text-[10px] text-subtle">
          Measured {when(usage.measuredAt)} · window {when(usage.periodStart)} – {when(usage.periodEnd)}
        </p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-[12px] font-semibold text-ink">Available plans</h3>
        <div className="mt-2 space-y-2">
          {availablePlans().map((option) => (
            <div key={option.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2.5">
              <div>
                <p className="text-[12px] font-medium text-ink">{option.name}</p>
                <p className="text-[11px] text-muted">{option.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-semibold text-ink">{formatPrice(option)}</span>
                <span className="text-[10px] text-subtle">Billing placeholder</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Payment processing arrives in a later phase. Your records are never deleted when a trial ends.
          See <Link href="/settings" className="font-medium text-brand hover:text-brand-strong">account settings</Link> for sign out.
        </p>
      </div>
    </Card>
  );
}
