import type { EntitlementSnapshot } from "./entitlements";
import type { BillingInterval, Plan, SubscriptionRecord, SubscriptionStatus } from "./types";

/** Converts the serialized API view back into Date-bearing records for pure helpers. */
export function toSubscriptionRecord(view: SubscriptionView | null): SubscriptionRecord | null {
  if (!view) return null;
  const date = (value: string | null) => (value ? new Date(value) : null);
  return {
    subscriptionId: view.subscriptionId,
    workspaceId: view.workspaceId,
    plan: view.plan,
    status: view.status,
    trialStartedAt: date(view.trialStartedAt),
    trialEndsAt: date(view.trialEndsAt),
    currentPeriodStartedAt: new Date(view.currentPeriodStartedAt),
    currentPeriodEndsAt: new Date(view.currentPeriodEndsAt),
    createdAt: new Date(view.createdAt),
    updatedAt: new Date(view.updatedAt),
    cancelAtPeriodEnd: view.cancelAtPeriodEnd,
    cancelledAt: date(view.cancelledAt),
    provider: view.provider,
    providerCustomerId: view.providerCustomerId,
    providerSubscriptionId: view.providerSubscriptionId,
  };
}

/** Serialized shapes returned by the authenticated subscription state route. */
export type SubscriptionView = {
  subscriptionId: string;
  workspaceId: string;
  plan: Plan;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStartedAt: string;
  currentPeriodEndsAt: string;
  createdAt: string;
  updatedAt: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
};

export type UsageView = {
  totalInquiries: number;
  activeInquiries: number;
  followUps: number;
  measuredAt: string;
  periodStart: string;
  periodEnd: string;
};

export type SubscriptionStateView = {
  subscription: SubscriptionView | null;
  entitlement: EntitlementSnapshot;
  usage: UsageView;
};
