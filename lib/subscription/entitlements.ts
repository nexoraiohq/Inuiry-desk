/**
 * Single authoritative entitlement evaluation layer.
 * Pure functions — no Firestore access, safe on client and server.
 * All privileged decisions must call these functions; no component may
 * implement its own plan check.
 */
import { getPlan, type FeatureKey, type PlanDefinition, type PlanLimits } from "@/lib/subscription/catalog";
import type { SubscriptionRecord, SubscriptionStatus } from "@/lib/subscription/types";

export type UsageSnapshotInput = {
  totalInquiries: number;
  activeInquiries: number;
  followUps: number;
};

export type EntitlementSnapshot = {
  planId: SubscriptionRecord["planId"];
  status: SubscriptionStatus;
  source: SubscriptionRecord["source"];
  plan: PlanDefinition;
  features: readonly FeatureKey[];
  limits: PlanLimits;
  /** Whether privileged write operations are currently allowed. */
  canWrite: boolean;
  /** Human-readable, non-sensitive explanation of the current state. */
  reason: string;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  gracePeriodEndsAt: Date | null;
  daysRemaining: number | null;
  grandfathered: boolean;
};

const WRITE_ALLOWED: readonly SubscriptionStatus[] = ["active", "grandfathered"];

/**
 * A workspace with no subscription record is treated as grandfathered. This
 * is deliberate: pre-Phase-10 workspaces must never be classified as expired.
 */
export function evaluateEntitlement(
  subscription: SubscriptionRecord | null,
  now: Date = new Date()
): EntitlementSnapshot {
  if (!subscription) {
    const plan = getPlan("starter");
    return {
      planId: "starter",
      status: "grandfathered",
      source: "phase10_grandfathered",
      plan,
      features: plan.features,
      limits: { activeInquiries: null, followUps: null },
      canWrite: true,
      reason: "Existing workspace — access preserved.",
      trialStartedAt: null,
      trialEndsAt: null,
      gracePeriodEndsAt: null,
      daysRemaining: null,
      grandfathered: true,
    };
  }

  const plan = getPlan(subscription.planId);
  const base = {
    planId: subscription.planId,
    status: subscription.status,
    source: subscription.source,
    plan,
    features: plan.features,
    limits: plan.limits,
    trialStartedAt: subscription.trialStartedAt,
    trialEndsAt: subscription.trialEndsAt,
    gracePeriodEndsAt: subscription.gracePeriodEndsAt,
    grandfathered: subscription.status === "grandfathered",
    daysRemaining: daysFrom(now, subscription.trialEndsAt),
  };

  if (WRITE_ALLOWED.includes(subscription.status)) {
    // Grandfathered workspaces keep unlimited access by design; no existing
    // customer is blocked by a newly introduced numerical limit.
    if (subscription.status === "grandfathered") {
      return { ...base, limits: { activeInquiries: null, followUps: null }, canWrite: true, reason: "Grandfathered access." };
    }
    return { ...base, canWrite: true, reason: "Subscription active." };
  }

  if (subscription.status === "trialing") {
    const ends = subscription.trialEndsAt?.getTime() ?? 0;
    if (ends > now.getTime()) {
      return { ...base, canWrite: true, reason: "Free trial in progress." };
    }
    return { ...base, canWrite: false, reason: "Free trial has ended." };
  }

  if (subscription.status === "past_due") {
    const grace = subscription.gracePeriodEndsAt?.getTime() ?? 0;
    if (grace > now.getTime()) {
      return { ...base, canWrite: true, reason: "Payment is past due; grace period is active." };
    }
    return { ...base, canWrite: false, reason: "Grace period has ended." };
  }

  const reasons: Record<string, string> = {
    cancelled: "Subscription cancelled.",
    expired: "Subscription expired.",
    suspended: "Subscription suspended.",
  };
  return {
    ...base,
    canWrite: false,
    reason: reasons[subscription.status] ?? "Subscription is not active.",
  };
}

function daysFrom(now: Date, end: Date | null): number | null {
  if (!end) return null;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

export function canUseFeature(entitlement: EntitlementSnapshot, feature: FeatureKey): boolean {
  return entitlement.features.includes(feature);
}

/**
 * Usage limits are adapted for grandfathered workspaces (null = unlimited).
 * Returns true when all defined limits are respected.
 */
export function withinUsageLimits(
  entitlement: EntitlementSnapshot,
  usage: UsageSnapshotInput
): boolean {
  const { activeInquiries, followUps } = entitlement.limits;
  if (activeInquiries !== null && usage.activeInquiries > activeInquiries) return false;
  if (followUps !== null && usage.followUps > followUps) return false;
  return true;
}

/** Single decision used by server callers before a privileged operation. */
export function authorizeOperation(
  entitlement: EntitlementSnapshot,
  feature: FeatureKey,
  usage: UsageSnapshotInput
): { allowed: boolean; reason: string } {
  if (!canUseFeature(entitlement, feature)) {
    return { allowed: false, reason: `Plan does not include ${feature}.` };
  }
  if (!entitlement.canWrite) {
    return { allowed: false, reason: entitlement.reason };
  }
  if (!withinUsageLimits(entitlement, usage)) {
    return { allowed: false, reason: "Usage limit reached for this plan." };
  }
  return { allowed: true, reason: "Allowed." };
}
