/**
 * Single authoritative entitlement evaluation layer.
 * Pure functions — usable from server components, server actions, API routes
 * and other protected server operations. No Firestore access, no client truth.
 */
import { getPlan, type FeatureKey } from "./catalog";
import type { Plan, SubscriptionRecord, SubscriptionStatus } from "./types";

export type EffectiveStatus = SubscriptionStatus | "grandfathered";

export type EntitlementSnapshot = {
  status: EffectiveStatus;
  plan: Plan;
  features: readonly FeatureKey[];
  /** Access to paid product functionality. */
  canAccessProduct: boolean;
  reason: string;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStartedAt: Date | null;
  currentPeriodEndsAt: Date | null;
  cancelledAt: Date | null;
  cancelAtPeriodEnd: boolean;
  daysRemaining: number | null;
  grandfathered: boolean;
};

const PAID_FEATURES = getPlan("starter").features;

function daysFrom(now: Date, end: Date | null): number | null {
  if (!end) return null;
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

function snapshot(
  record: SubscriptionRecord | null,
  status: EffectiveStatus,
  canAccessProduct: boolean,
  reason: string,
  now: Date
): EntitlementSnapshot {
  return {
    status,
    plan: record?.plan ?? "starter",
    features: canAccessProduct ? PAID_FEATURES : [],
    canAccessProduct,
    reason,
    trialStartedAt: record?.trialStartedAt ?? null,
    trialEndsAt: record?.trialEndsAt ?? null,
    currentPeriodStartedAt: record?.currentPeriodStartedAt ?? null,
    currentPeriodEndsAt: record?.currentPeriodEndsAt ?? null,
    cancelledAt: record?.cancelledAt ?? null,
    cancelAtPeriodEnd: record?.cancelAtPeriodEnd ?? false,
    daysRemaining: daysFrom(now, record?.trialEndsAt ?? record?.currentPeriodEndsAt ?? null),
    grandfathered: status === "grandfathered",
  };
}

/**
 * A missing subscription record is an existing workspace and is grandfathered
 * by trusted server policy. It is never treated as expired.
 */
export function evaluateEntitlement(
  subscription: SubscriptionRecord | null,
  now: Date = new Date()
): EntitlementSnapshot {
  if (!subscription) {
    return snapshot(null, "grandfathered", true, "Existing workspace — access preserved.", now);
  }

  const periodEnd = subscription.currentPeriodEndsAt.getTime();
  const trialEnd = subscription.trialEndsAt?.getTime() ?? 0;

  switch (subscription.status) {
    case "trialing":
      if (trialEnd > now.getTime()) {
        return snapshot(subscription, "trialing", true, "Free trial in progress.", now);
      }
      return snapshot(subscription, "expired", false, "Free trial has ended.", now);

    case "active":
      if (periodEnd > now.getTime()) {
        return snapshot(subscription, "active", true, "Starter subscription active.", now);
      }
      return snapshot(subscription, "expired", false, "Subscription period has ended.", now);

    case "past_due":
      // Policy: a past-due subscription keeps Starter access until the end of
      // the paid period already granted, then expires. No grace is invented.
      if (periodEnd > now.getTime()) {
        return snapshot(subscription, "past_due", true, "Payment past due; access continues to period end.", now);
      }
      return snapshot(subscription, "expired", false, "Past-due period has ended.", now);

    case "cancelled":
      if (subscription.cancelAtPeriodEnd && subscription.cancelledAt && periodEnd > now.getTime()) {
        return snapshot(subscription, "cancelled", true, "Cancelled at period end; access continues until then.", now);
      }
      return snapshot(subscription, "cancelled", false, "Subscription cancelled.", now);

    case "expired":
      return snapshot(subscription, "expired", false, "Subscription expired.", now);

    default:
      return snapshot(subscription, "expired", false, "Subscription is not active.", now);
  }
}

export function canUseFeature(entitlement: EntitlementSnapshot, feature: FeatureKey): boolean {
  return entitlement.canAccessProduct && entitlement.features.includes(feature);
}

/** Single decision for server callers; never trust hidden UI controls. */
export function authorizeAccess(
  entitlement: EntitlementSnapshot,
  feature: FeatureKey
): { allowed: boolean; reason: string } {
  if (!canUseFeature(entitlement, feature)) {
    return { allowed: false, reason: entitlement.reason };
  }
  return { allowed: true, reason: "Allowed." };
}
