"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { BILLING_INTERVAL, formatPrice, getPlan } from "@/lib/subscription/catalog";
import { formatInZone } from "@/lib/datetime/zone";
import { auth } from "@/lib/firebase";
import type { EffectiveStatus } from "@/lib/subscription/entitlements";

const STATUS_LABELS: Record<EffectiveStatus, string> = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment past due",
  cancelled: "Cancelled",
  expired: "Expired",
  grandfathered: "Existing access",
};

function when(value: string | null): string {
  if (!value) return "—";
  return formatInZone(new Date(value), { dateStyle: "medium", timeStyle: "short" });
}

export function SubscriptionForm() {
  const { state, loading, error, refresh } = useSubscription();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (loading || !state) {
    return (
      <Card className="bg-canvas/80 p-4 shadow-card sm:p-6">
        <h2 className="font-display text-[15px] font-semibold text-ink">Subscription</h2>
        <p className="mt-3 text-[12px] text-muted">Loading subscription information…</p>
      </Card>
    );
  }

  const { entitlement, usage, subscription } = state;
  const plan = getPlan(entitlement.plan);
  const canCancel = subscription?.status === "active" || subscription?.status === "past_due";

  async function cancel() {
    setBusy(true);
    setActionError(null);
    try {
      const token = auth ? await auth.currentUser?.getIdToken() : null;
      if (!token) throw new Error("Sign in to manage your subscription.");
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not schedule cancellation.");
      await refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not schedule cancellation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-canvas/80 p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ink">Subscription</h2>
          <p className="mt-1 text-[12px] text-muted">Plan, status and access for this workspace.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className={buttonClasses("secondary", "sm")}>
          <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      {error ? <div className="mt-4"><Notice tone="danger" message={error} /></div> : null}
      {actionError ? <div className="mt-4"><Notice tone="danger" message={actionError} /></div> : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line p-3.5">
          <p className="text-[11px] font-medium text-subtle">Current plan</p>
          <p className="mt-1 font-display text-[16px] font-semibold text-ink">{plan.name}</p>
          <p className="mt-1 text-[11px] text-muted">
            {formatPrice(entitlement.plan)} · billed {BILLING_INTERVAL}
          </p>
        </div>
        <div className="rounded-xl border border-line p-3.5">
          <p className="text-[11px] font-medium text-subtle">Status</p>
          <p className="mt-1 font-display text-[16px] font-semibold text-ink">
            {STATUS_LABELS[entitlement.status]}
          </p>
          <p className="mt-1 text-[11px] text-muted">{entitlement.reason}</p>
        </div>
      </div>

      {entitlement.grandfathered ? (
        <div className="mt-4 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[12px] text-muted">
          This is an existing workspace. Access is preserved under the grandfathering policy; no trial or paid
          subscription has been assigned.
        </div>
      ) : null}

      {!entitlement.canAccessProduct ? (
        <div className="mt-4">
          <Notice
            tone="danger"
            message="Access to paid features has ended. Your inquiries, follow-ups, communications and reports are preserved. Subscription payments are not yet enabled — no payment form is available in this phase."
          />
        </div>
      ) : null}

      {subscription ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium text-subtle">Trial started</p>
            <p className="mt-1 text-[12px] text-ink">{when(subscription.trialStartedAt)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-subtle">Trial ends</p>
            <p className="mt-1 text-[12px] text-ink">{when(subscription.trialEndsAt)}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-subtle">Days remaining</p>
            <p className="mt-1 text-[12px] text-ink">
              {entitlement.daysRemaining === null ? "—" : entitlement.daysRemaining}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium text-subtle">Current period</p>
            <p className="mt-1 text-[12px] text-ink">
              {when(subscription.currentPeriodStartedAt)} – {when(subscription.currentPeriodEndsAt)}
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
        {entitlement.features.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted">No paid features are currently available.</p>
        ) : null}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-[12px] font-semibold text-ink">Workspace usage</h3>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <p className="text-[12px] text-muted">Active inquiries: <span className="font-semibold text-ink">{usage.activeInquiries}</span></p>
          <p className="text-[12px] text-muted">Follow-ups: <span className="font-semibold text-ink">{usage.followUps}</span></p>
          <p className="text-[12px] text-muted">All inquiries: <span className="font-semibold text-ink">{usage.totalInquiries}</span></p>
        </div>
        <p className="mt-2 text-[10px] text-subtle">
          Measured {when(usage.measuredAt)} · window {when(usage.periodStart)} – {when(usage.periodEnd)}
        </p>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-[12px] font-semibold text-ink">Plans and restoration</h3>
        <div className="mt-2 rounded-lg border border-line px-3 py-2.5">
          <p className="text-[12px] font-medium text-ink">Starter · {formatPrice("starter")}</p>
          <p className="text-[11px] text-muted">
            Monthly Starter plan. Payment processing is not enabled in this phase, so no checkout is offered.
          </p>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          When payments are integrated, a trusted server-side activation will restore access without recreating
          this workspace or removing any records. To schedule cancellation at period end, use the action below.
        </p>
        {canCancel ? (
          <button type="button" onClick={() => void cancel()} disabled={busy} className={buttonClasses("secondary", "sm", "mt-3")}>
            {busy ? "Scheduling…" : "Cancel at period end"}
          </button>
        ) : null}
        {subscription?.cancelAtPeriodEnd ? (
          <p className="mt-2 text-[11px] text-danger">Cancellation scheduled; access continues until {when(subscription.currentPeriodEndsAt)}.</p>
        ) : null}
      </div>
    </Card>
  );
}
