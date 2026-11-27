"use client";

import Link from "next/link";
import { ArrowUpRight, CreditCard, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { formatPrice, getPlan } from "@/lib/subscription/catalog";
import { formatInZone } from "@/lib/datetime/zone";
import type { EffectiveStatus } from "@/lib/subscription/entitlements";

const LABELS: Record<EffectiveStatus, string> = {
  trialing: "Free trial",
  active: "Active Starter",
  past_due: "Payment past due",
  cancelled: "Cancelled",
  expired: "Expired",
  grandfathered: "Existing access",
};

function tone(status: EffectiveStatus): string {
  if (status === "active" || status === "trialing" || status === "grandfathered") {
    return "bg-success-soft text-success";
  }
  if (status === "past_due") return "bg-brand-soft text-brand";
  return "bg-danger-soft text-danger";
}

function date(value: string | null): string {
  if (!value) return "—";
  return formatInZone(new Date(value), { dateStyle: "medium" });
}

/** Dashboard-level subscription snapshot linked to the full management UI. */
export function DashboardSubscriptionCard() {
  const { state, loading } = useSubscription();
  if (loading || !state) return null;

  const { entitlement, subscription } = state;
  const plan = getPlan(entitlement.plan);
  const attention = !entitlement.canAccessProduct || (entitlement.daysRemaining !== null && entitlement.daysRemaining <= 3);

  return (
    <Card className={`p-4 sm:p-5 ${attention ? "border-brand/30 bg-brand-soft/25" : "bg-canvas/80"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface text-brand">
          {entitlement.status === "trialing" ? <Sparkles className="size-4" aria-hidden="true" /> : <CreditCard className="size-4" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-[16px] font-semibold text-ink">{plan.name}</p>
            <Badge className={tone(entitlement.status)}>{LABELS[entitlement.status]}</Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted">
            {entitlement.status === "trialing"
              ? `${entitlement.daysRemaining} day${entitlement.daysRemaining === 1 ? "" : "s"} remaining · trial ends ${date(subscription?.trialEndsAt ?? null)}`
              : entitlement.status === "active" || entitlement.status === "past_due" || entitlement.status === "cancelled"
                ? `${formatPrice(entitlement.plan)} · next billing date ${date(subscription?.currentPeriodEndsAt ?? null)}`
                : entitlement.reason}
          </p>
        </div>
        <Link href="/settings" className={buttonClasses("secondary", "sm")}>
          Manage subscription <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      {attention && entitlement.canAccessProduct ? (
        <p className="mt-3 text-[13px] font-medium text-brand">
          Pick Starter in Settings to keep everything running when the trial ends. Demo checkout only — no money is collected.
        </p>
      ) : null}
      {!entitlement.canAccessProduct ? (
        <p className="mt-3 text-[13px] font-medium text-danger">
          Paid features are paused, but your data is safe. Open Settings to choose Starter and resume.
        </p>
      ) : null}
    </Card>
  );
}
