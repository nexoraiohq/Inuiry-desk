import type { EntitlementSnapshot } from "./entitlements";
import type { BillingInterval, Plan, SubscriptionStatus } from "./types";

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
