/** Client-safe billing vocabulary and pure eligibility/period helpers. */
import { BILLING_CURRENCY, STARTER_MONTHLY_PRICE, getPlan } from "./catalog";
import type { SubscriptionRecord } from "./types";

export const CHECKOUT_INTENTS = ["purchase", "renewal"] as const;
export type CheckoutIntent = (typeof CHECKOUT_INTENTS)[number];

export const CHECKOUT_OUTCOMES = ["success", "failure", "cancel"] as const;
export type CheckoutOutcome = (typeof CHECKOUT_OUTCOMES)[number];

export const BILLING_STATUSES = ["succeeded", "failed", "cancelled"] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export type CheckoutSummary = {
  plan: "starter";
  name: string;
  amount: number;
  currency: string;
  billingInterval: "monthly";
  simulated: true;
  intent: CheckoutIntent;
};

/** Prices always come from the catalog, never from the browser. */
export function checkoutSummary(intent: CheckoutIntent): CheckoutSummary {
  const plan = getPlan("starter");
  return {
    plan: "starter",
    name: plan.name,
    amount: plan.monthlyPrice ?? STARTER_MONTHLY_PRICE,
    currency: BILLING_CURRENCY,
    billingInterval: "monthly",
    simulated: true,
    intent,
  };
}

export function formatAmount(amount: number): string {
  return `${BILLING_CURRENCY} ${amount.toLocaleString()}`;
}

/** A renewal extends a still-valid paid period; purchase starts a new one. */
export function isRenewalEligible(subscription: SubscriptionRecord | null, now: Date = new Date()): boolean {
  if (!subscription) return false;
  if (!["active", "past_due", "cancelled"].includes(subscription.status)) return false;
  return subscription.currentPeriodEndsAt.getTime() > now.getTime();
}

export function isPurchaseEligible(subscription: SubscriptionRecord | null): boolean {
  if (!subscription) return true; // grandfathered workspace may purchase Starter
  return ["trialing", "expired", "cancelled", "past_due"].includes(subscription.status);
}

/**
 * A renewal extends from the existing period end, never from an earlier date.
 * A purchase starts a fresh 30-day period at the moment of processing.
 */
export function nextBillingPeriod(
  intent: CheckoutIntent,
  subscription: SubscriptionRecord | null,
  now: Date
): { start: Date; end: Date } {
  const days = 30;
  if (intent === "renewal" && subscription && subscription.currentPeriodEndsAt.getTime() > now.getTime()) {
    const start = new Date(subscription.currentPeriodEndsAt.getTime());
    return { start, end: new Date(start.getTime() + days * 86_400_000) };
  }
  return { start: now, end: new Date(now.getTime() + days * 86_400_000) };
}

export function billingStatusFor(outcome: CheckoutOutcome): BillingStatus {
  if (outcome === "success") return "succeeded";
  if (outcome === "failure") return "failed";
  return "cancelled";
}
