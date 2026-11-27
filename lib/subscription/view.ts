import type { EntitlementSnapshot } from "@/lib/subscription/entitlements";
import type { BillingCycle, PlanId, SubscriptionSource, SubscriptionStatus } from "@/lib/subscription/types";

/** Serialized shapes returned by the authenticated subscription state route. */
export type SubscriptionView = {
  subscriptionId: string;
  workspaceId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  gracePeriodEndsAt: string | null;
  source: SubscriptionSource;
  metadata: Record<string, string | number | boolean | null> | null;
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
