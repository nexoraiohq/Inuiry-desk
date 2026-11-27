/** Subscription domain types. Client-safe: no server-only imports. */

export type FirestoreTime = { toDate: () => Date };

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "cancelled",
  "expired",
  "suspended",
  "grandfathered",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const PLAN_IDS = ["trial", "starter", "growth"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export const BILLING_CYCLES = ["monthly", "annual"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export const SUBSCRIPTION_SOURCES = [
  "phase10_trial",
  "phase10_grandfathered",
  "phase10_recovery",
] as const;
export type SubscriptionSource = (typeof SUBSCRIPTION_SOURCES)[number];

/** Privileged fields are written only by Firebase Admin. Clients cannot write them. */
export type SubscriptionDocument = {
  subscriptionId: string;
  workspaceId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStartedAt: FirestoreTime | null;
  trialEndsAt: FirestoreTime | null;
  currentPeriodStart: FirestoreTime | null;
  currentPeriodEnd: FirestoreTime | null;
  createdAt: FirestoreTime;
  updatedAt: FirestoreTime;
  cancelledAt: FirestoreTime | null;
  gracePeriodEndsAt: FirestoreTime | null;
  source: SubscriptionSource;
  metadata: Record<string, string | number | boolean> | null;
};

/** Application-facing shape with absolute Dates, safe for display logic. */
export type SubscriptionRecord = {
  subscriptionId: string;
  workspaceId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  gracePeriodEndsAt: Date | null;
  source: SubscriptionSource;
  metadata: Record<string, string | number | boolean> | null;
};

function asDate(value: unknown): Date | null {
  if (value && typeof (value as FirestoreTime).toDate === "function") {
    return (value as FirestoreTime).toDate();
  }
  return null;
}

export function parseSubscription(
  data: SubscriptionDocument,
  fallbackId = "current"
): SubscriptionRecord {
  return {
    subscriptionId: String(data.subscriptionId ?? fallbackId),
    workspaceId: String(data.workspaceId ?? ""),
    planId: data.planId,
    status: data.status,
    billingCycle: data.billingCycle,
    trialStartedAt: asDate(data.trialStartedAt),
    trialEndsAt: asDate(data.trialEndsAt),
    currentPeriodStart: asDate(data.currentPeriodStart),
    currentPeriodEnd: asDate(data.currentPeriodEnd),
    createdAt: asDate(data.createdAt) ?? new Date(0),
    updatedAt: asDate(data.updatedAt) ?? new Date(0),
    cancelledAt: asDate(data.cancelledAt),
    gracePeriodEndsAt: asDate(data.gracePeriodEndsAt),
    source: data.source,
    metadata: data.metadata ?? null,
  };
}
