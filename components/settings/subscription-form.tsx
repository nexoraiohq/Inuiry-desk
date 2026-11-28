"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CreditCard,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { useSubscription } from "@/components/subscription/subscription-provider";
import { BILLING_INTERVAL, formatPrice, getPlan, PLAN_ORDER } from "@/lib/subscription/catalog";
import {
  checkoutSummary,
  formatAmount,
  isPurchaseEligible,
  isRenewalEligible,
  type CheckoutIntent,
  type CheckoutOutcome,
} from "@/lib/subscription/billing-shared";
import {
  cancelSubscription,
  completeCheckout,
  createCheckout,
  fetchBillingHistory,
  type BillingRecordView,
  type CheckoutResultView,
} from "@/lib/subscription/client";
import { formatInZone } from "@/lib/datetime/zone";
import { evaluateEntitlement, type EffectiveStatus } from "@/lib/subscription/entitlements";
import { toSubscriptionRecord, type SubscriptionStateView } from "@/lib/subscription/view";

type Tab = "overview" | "plans" | "billing";

const STATUS_LABELS: Record<EffectiveStatus, string> = {
  trialing: "Free trial",
  active: "Active Starter",
  past_due: "Payment past due",
  cancelled: "Cancelled",
  expired: "Expired",
  grandfathered: "Existing access",
};

function statusVariant(status: EffectiveStatus): string {
  if (status === "active" || status === "trialing" || status === "grandfathered") {
    return "bg-success-soft text-success";
  }
  if (status === "past_due") return "bg-brand-soft text-brand";
  return "bg-danger-soft text-danger";
}

function when(value: string | null): string {
  if (!value) return "—";
  return formatInZone(new Date(value), { dateStyle: "medium", timeStyle: "short" });
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-subtle">{label}</p>
      <p className="mt-1 text-[13px] text-ink">{value}</p>
    </div>
  );
}

export function SubscriptionForm() {
  const { state, loading, error, refresh } = useSubscription();
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [intent, setIntent] = useState<CheckoutIntent>("purchase");
  const [outcome, setOutcome] = useState<CheckoutOutcome>("success");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [result, setResult] = useState<CheckoutResultView | null>(null);
  const [billing, setBilling] = useState<BillingRecordView[] | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      setBilling(await fetchBillingHistory());
    } catch (caught) {
      setBillingError(caught instanceof Error ? caught.message : "Could not load billing history.");
    } finally {
      setBillingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab !== "billing") return;
    const timer = window.setTimeout(() => { void loadBilling(); }, 0);
    return () => window.clearTimeout(timer);
  }, [tab, loadBilling]);

  if (loading && !state) {
    return (
      <Card className="bg-surface p-4 shadow-card sm:p-6">
        <h2 className="font-display text-[15px] font-semibold text-ink">Subscription</h2>
        <p className="mt-3 text-[12px] text-muted">Loading subscription information…</p>
      </Card>
    );
  }

  // The whole interface stays usable even if the status call fails: plans,
  // billing history and explanatory copy are always visible.
  const unavailable = !state;
  const fallback: SubscriptionStateView = {
    subscription: null,
    entitlement: evaluateEntitlement(null),
    usage: {
      totalInquiries: 0,
      activeInquiries: 0,
      followUps: 0,
      measuredAt: new Date().toISOString(),
      periodStart: new Date().toISOString(),
      periodEnd: new Date().toISOString(),
    },
  };
  const view = state ?? fallback;
  const { entitlement, usage, subscription } = view;
  const record = toSubscriptionRecord(subscription);
  const canPurchase = !unavailable && isPurchaseEligible(record);
  const canRenew = !unavailable && isRenewalEligible(record);
  const summary = checkoutSummary(intent);
  const nextBillingDate = subscription?.currentPeriodEndsAt ?? null;

  function selectCheckout(next: CheckoutIntent) {
    setIntent(next);
    setOutcome("success");
    setIdempotencyKey(null);
    setResult(null);
    setActionError(null);
    setActionSuccess(null);
    setTab("plans");
  }

  async function confirmCheckout() {
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const key = idempotencyKey ?? globalThis.crypto.randomUUID();
      setIdempotencyKey(key);
      const session = await createCheckout(intent, outcome, key);
      const checkoutResult = await completeCheckout(session.sessionId);
      setResult(checkoutResult);
      await Promise.all([refresh(), loadBilling()]);
      if (!checkoutResult.ok) setActionError(checkoutResult.message);
      else setActionSuccess(checkoutResult.message);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Checkout could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelAtPeriodEnd() {
    setBusy(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await cancelSubscription();
      setConfirmCancel(false);
      await refresh();
      setActionSuccess(
        response.changed
          ? "Cancellation scheduled. Access continues until the current period ends."
          : "Cancellation is already scheduled."
      );
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not schedule cancellation.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-surface p-4 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-semibold text-ink">Subscription &amp; billing</h2>
          <p className="mt-1 text-[12px] text-muted">Manage your plan, simulated payments and billing history.</p>
        </div>
        <button type="button" onClick={() => void refresh()} className={buttonClasses("secondary", "sm")}>
          <RefreshCw className="size-3.5" aria-hidden="true" /> Refresh
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-line pb-3" role="tablist" aria-label="Subscription sections">
        {(["overview", "plans", "billing"] as Tab[]).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            onClick={() => setTab(item)}
            className={`rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors ${
              tab === item ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface hover:text-ink"
            }`}
          >
            {item === "overview" ? "Overview" : item === "plans" ? "Plans & checkout" : "Billing history"}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mt-4">
          <Notice tone="danger" message={`${error} Plans and billing history are still available below.`} />
          <button type="button" onClick={() => void refresh()} className={buttonClasses("secondary", "sm", "mt-2")}>
            Retry status
          </button>
        </div>
      ) : null}
      {actionError ? <div className="mt-4"><Notice tone="danger" message={actionError} /></div> : null}
      {actionSuccess ? <div className="mt-4"><Notice tone="success" message={actionSuccess} /></div> : null}

      {tab === "overview" ? (
        <div className="mt-5 space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-4">
            <div>
              <p className="text-[12px] font-medium text-subtle">Current plan</p>
              <p className="mt-1 font-display text-[20px] font-semibold text-ink">{getPlan(entitlement.plan).name}</p>
            </div>
            <Badge className={unavailable ? "bg-danger-soft text-danger" : statusVariant(entitlement.status)}>
              {unavailable ? "Status unavailable" : STATUS_LABELS[entitlement.status]}
            </Badge>
            <p className="ml-auto text-[12px] text-muted">{formatPrice(entitlement.plan)} · billed {BILLING_INTERVAL}</p>
          </div>

          <p className="text-[12px] text-muted">
            {unavailable ? "Current subscription status could not be loaded. Use Retry above." : entitlement.reason}
          </p>

          {!unavailable && entitlement.grandfathered ? (
            <div className="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[12px] text-muted">
              Existing workspace: access is preserved without a paid subscription. You may choose Starter at any time.
            </div>
          ) : null}
          {!entitlement.canAccessProduct ? (
            <Notice
              tone="danger"
              message="Paid features are restricted. Your records are preserved. Choose Starter in Plans & checkout to restore access."
            />
          ) : null}
          {entitlement.status === "trialing" && (entitlement.daysRemaining ?? 0) <= 3 ? (
            <div className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-[12px] font-medium text-brand">
              Your trial ends in {entitlement.daysRemaining} day{entitlement.daysRemaining === 1 ? "" : "s"}.
            </div>
          ) : null}
          {subscription?.cancelAtPeriodEnd ? (
            <div className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-[12px] text-danger">
              Cancellation effective {when(subscription.currentPeriodEndsAt)}. Access remains available until then.
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatusLine label="Trial started" value={when(subscription?.trialStartedAt ?? null)} />
            <StatusLine label="Trial expires" value={when(subscription?.trialEndsAt ?? null)} />
            <StatusLine label="Days remaining" value={entitlement.daysRemaining === null ? "—" : String(entitlement.daysRemaining)} />
            <StatusLine label="Current period" value={when(subscription?.currentPeriodStartedAt ?? null)} />
            <StatusLine label="Next billing date" value={entitlement.canAccessProduct ? when(nextBillingDate) : "—"} />
            <StatusLine label="Cancellation effective" value={subscription?.cancelledAt ? when(subscription.currentPeriodEndsAt) : "—"} />
          </div>

          <div>
            <h3 className="text-[12px] font-semibold text-ink">Current entitlements</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entitlement.features.length ? entitlement.features.map((feature) => (
                <span key={feature} className="rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted">
                  {feature.replace(/([A-Z])/g, " $1")}
                </span>
              )) : <span className="text-[12px] text-muted">No paid features available.</span>}
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="text-[12px] font-semibold text-ink">Usage (informational)</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <StatusLine label="Active inquiries" value={unavailable ? "—" : String(usage.activeInquiries)} />
              <StatusLine label="Follow-ups" value={unavailable ? "—" : String(usage.followUps)} />
              <StatusLine label="All inquiries" value={unavailable ? "—" : String(usage.totalInquiries)} />
            </div>
            <p className="mt-2 text-[10px] text-subtle">
              Measured {when(usage.measuredAt)} · window {when(usage.periodStart)} – {when(usage.periodEnd)}.
              Usage figures are informational and are not enforced as hard limits.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {canPurchase ? (
              <button type="button" onClick={() => selectCheckout("purchase")} className={buttonClasses("primary", "md")}>
                Choose Starter <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            ) : null}
            {canRenew ? (
              <button type="button" onClick={() => selectCheckout("renewal")} className={buttonClasses("secondary", "md")}>
                Simulate renewal
              </button>
            ) : null}
            {(subscription?.status === "active" || subscription?.status === "past_due") && !subscription.cancelAtPeriodEnd ? (
              <button type="button" onClick={() => setConfirmCancel(true)} className={buttonClasses("secondary", "md")}>
                Cancel at period end
              </button>
            ) : null}
          </div>

          {confirmCancel ? (
            <div className="rounded-xl border border-danger/20 bg-danger-soft p-4">
              <p className="text-[12px] font-medium text-ink">Cancel Starter at the end of the current period?</p>
              <p className="mt-1 text-[11px] text-muted">
                Access continues until {when(nextBillingDate)}. No records are removed.
              </p>
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => void cancelAtPeriodEnd()} disabled={busy} className={buttonClasses("primary", "sm")}>
                  {busy ? "Confirming…" : "Confirm cancellation"}
                </button>
                <button type="button" onClick={() => setConfirmCancel(false)} className={buttonClasses("ghost", "sm")}>Keep plan</button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "plans" ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            {PLAN_ORDER.map((plan) => {
              const entry = getPlan(plan);
              const current = entitlement.plan === plan;
              return (
                <div key={plan} className={`rounded-xl border p-4 ${current ? "border-brand bg-brand-soft/30" : "border-line"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-[15px] font-semibold text-ink">{entry.name}</p>
                    {current ? <Badge variant="brand">Current</Badge> : null}
                  </div>
                  <p className="mt-2 font-display text-[26px] font-semibold tracking-[-0.02em] text-ink">{formatPrice(plan)}</p>
                  <p className="mt-1 text-[12px] text-muted">{entry.description}</p>
                  <ul className="mt-3 space-y-1">
                    {entry.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-[12px] text-muted">
                        <Check className="size-3.5 text-success" aria-hidden="true" /> {feature.replace(/([A-Z])/g, " $1")}
                      </li>
                    ))}
                  </ul>
                  {plan === "starter" && (canPurchase || canRenew) ? (
                    <button
                      type="button"
                      onClick={() => selectCheckout(canRenew ? "renewal" : "purchase")}
                      className={buttonClasses("primary", "sm", "mt-4")}
                    >
                      {canRenew ? "Renew Starter" : "Choose Starter"}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          {(canPurchase || canRenew) && (intent === "purchase" ? canPurchase : canRenew) ? (
            <div className="rounded-xl border border-line bg-surface p-4">
              <h3 className="font-display text-[14px] font-semibold text-ink">Order summary</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <StatusLine label="Plan" value={summary.name} />
                <StatusLine label="Amount" value={formatAmount(summary.amount)} />
                <StatusLine label="Billing interval" value={summary.billingInterval} />
                <StatusLine label="Type" value={summary.intent === "renewal" ? "Renewal" : "New subscription"} />
              </div>
              <p className="mt-3 text-[12px] font-medium text-brand">Demo mode — no real payment will be collected.</p>
              <p className="mt-1 text-[11px] text-muted">
                Starter begins on confirmation and runs for 30 days. Cancellation takes effect at period end.
              </p>
              <fieldset className="mt-4">
                <legend className="text-[11px] font-medium text-subtle">Simulated outcome</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["success", "failure", "cancel"] as CheckoutOutcome[]).map((option) => (
                    <label key={option} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink">
                      <input
                        type="radio"
                        name="simulated-outcome"
                        value={option}
                        className="accent-brand"
                        checked={outcome === option}
                        onChange={() => { setOutcome(option); setResult(null); }}
                      />
                      {option === "success" ? "Successful payment" : option === "failure" ? "Failed payment" : "Cancel checkout"}
                    </label>
                  ))}
                </div>
              </fieldset>
              <button type="button" onClick={() => void confirmCheckout()} disabled={busy} className={buttonClasses("primary", "md", "mt-4")}>
                <CreditCard className="size-4" aria-hidden="true" /> {busy ? "Processing…" : "Confirm simulated checkout"}
              </button>
              {result ? (
                <div className={`mt-4 flex items-start gap-2 rounded-lg px-3 py-2.5 text-[12px] ${
                  result.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
                }`} role="status">
                  {result.ok ? <ShieldCheck className="size-4 shrink-0" aria-hidden="true" /> : <AlertCircle className="size-4 shrink-0" aria-hidden="true" />}
                  <span>
                    {result.message} Reference {result.reference}. Simulated transaction only.
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "billing" ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] text-muted">Simulated transactions for this workspace.</p>
            <button type="button" onClick={() => void loadBilling()} disabled={billingLoading} className={buttonClasses("secondary", "sm")}>
              <RefreshCw className={`size-3.5 ${billingLoading ? "animate-spin" : ""}`} aria-hidden="true" /> Refresh
            </button>
          </div>
          {billingError ? <div className="mt-3"><Notice tone="danger" message={billingError} /></div> : null}
          {billingLoading && !billing ? <p className="mt-4 text-[12px] text-muted">Loading billing history…</p> : null}
          {!billingLoading && billing?.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <CreditCard className="mx-auto size-6 text-subtle" aria-hidden="true" />
              <p className="mt-2 text-[12px] font-medium text-ink">No simulated transactions yet</p>
              <p className="mt-1 text-[11px] text-muted">Checkout attempts will appear here.</p>
            </div>
          ) : null}
          {billing && billing.length > 0 ? (
            <div className="mt-4 space-y-2">
              {billing.map((item) => (
                <div key={item.sessionId} className="rounded-xl border border-line px-3.5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[12px] font-medium text-ink">{item.reference}</p>
                    <Badge className={item.status === "succeeded" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}>
                      {item.status} · simulated
                    </Badge>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <StatusLine label="Plan" value={item.plan} />
                    <StatusLine label="Amount" value={`${item.currency} ${item.amount.toLocaleString()}`} />
                    <StatusLine label="Type" value={item.type} />
                    <StatusLine label="Date" value={when(item.createdAt)} />
                    <StatusLine label="Billing period" value={`${when(item.periodStart)} – ${when(item.periodEnd)}`} />
                    <StatusLine label="Outcome" value={item.outcome} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
