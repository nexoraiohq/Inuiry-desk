/**
 * Subscription domain types. Client-safe: no server-only imports and no
 * Firebase Admin dependency.
 *
 * Plan and status values are authoritative server data; clients never supply
 * them. Grandfathering is a server policy for a *missing* record, not a
 * client-writable status.
 */
export type FirestoreTime = { toDate: () => Date };

export const PLANS = ["trial", "starter"] as const;
export type Plan = (typeof PLANS)[number];

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "expired",
  "cancelled",
  "past_due",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_INTERVALS = ["monthly"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/** Nullable until a payment provider is integrated in a later phase. */
export type ProviderFields = {
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
};

export type SubscriptionDocument = ProviderFields & {
  subscriptionId: string;
  workspaceId: string;
  plan: Plan;
  status: SubscriptionStatus;
  trialStartedAt: FirestoreTime | null;
  trialEndsAt: FirestoreTime | null;
  currentPeriodStartedAt: FirestoreTime;
  currentPeriodEndsAt: FirestoreTime;
  createdAt: FirestoreTime;
  updatedAt: FirestoreTime;
  cancelAtPeriodEnd: boolean;
  cancelledAt: FirestoreTime | null;
};

export type SubscriptionRecord = ProviderFields & {
  subscriptionId: string;
  workspaceId: string;
  plan: Plan;
  status: SubscriptionStatus;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStartedAt: Date;
  currentPeriodEndsAt: Date;
  createdAt: Date;
  updatedAt: Date;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
};

function asDate(value: unknown): Date | null {
  if (value && typeof (value as FirestoreTime).toDate === "function") {
    return (value as FirestoreTime).toDate();
  }
  return null;
}

function asRequiredDate(value: unknown, fallback: Date): Date {
  return asDate(value) ?? fallback;
}

export function parseSubscription(
  data: SubscriptionDocument,
  fallbackId = "current"
): SubscriptionRecord {
  const epoch = new Date(0);
  return {
    subscriptionId: String(data.subscriptionId ?? fallbackId),
    workspaceId: String(data.workspaceId ?? ""),
    plan: data.plan,
    status: data.status,
    trialStartedAt: asDate(data.trialStartedAt),
    trialEndsAt: asDate(data.trialEndsAt),
    currentPeriodStartedAt: asRequiredDate(data.currentPeriodStartedAt, epoch),
    currentPeriodEndsAt: asRequiredDate(data.currentPeriodEndsAt, epoch),
    createdAt: asRequiredDate(data.createdAt, epoch),
    updatedAt: asRequiredDate(data.updatedAt, epoch),
    cancelAtPeriodEnd: Boolean(data.cancelAtPeriodEnd),
    cancelledAt: asDate(data.cancelledAt),
    provider: data.provider ?? null,
    providerCustomerId: data.providerCustomerId ?? null,
    providerSubscriptionId: data.providerSubscriptionId ?? null,
  };
}

/** Server-side validation of any subscription record before a write. */
export function isValidPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export function isValidStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === "string" && (SUBSCRIPTION_STATUSES as readonly string[]).includes(value);
}

export function isValidSubscription(data: unknown): data is SubscriptionDocument {
  if (!data || typeof data !== "object") return false;
  const value = data as Partial<SubscriptionDocument>;
  return (
    typeof value.subscriptionId === "string" &&
    typeof value.workspaceId === "string" &&
    isValidPlan(value.plan) &&
    isValidStatus(value.status) &&
    typeof value.cancelAtPeriodEnd === "boolean" &&
    Boolean(value.currentPeriodStartedAt && value.currentPeriodEndsAt && value.createdAt && value.updatedAt)
  );
}
