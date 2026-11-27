/**
 * Centralized commercial catalog. Pricing and feature flags live here only —
 * business logic never hardcodes a price or a limit.
 *
 * These values are public display configuration. Privileged internal
 * configuration does not exist here; trial creation and status changes are
 * performed by Firebase Admin in trusted server code.
 */
import type { BillingCycle, PlanId } from "@/lib/subscription/types";

export const TRIAL_DURATION_DAYS = 14;
export const BILLING_CURRENCY = "KES";

export const FEATURE_KEYS = [
  "inquiries",
  "followUps",
  "communications",
  "reports",
  "reminders",
  "settings",
  "dataExport",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type PlanLimits = {
  /** null means no limit defined for this plan. */
  activeInquiries: number | null;
  followUps: number | null;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  /** Amount in the smallest configured currency unit. Starter = KES 1,500. */
  monthlyPrice: number;
  billingCycle: BillingCycle;
  trialDays: number;
  features: readonly FeatureKey[];
  limits: PlanLimits;
  /** Growth is catalogued but not commercially released yet. */
  available: boolean;
  sortOrder: number;
};

export const PLANS: Readonly<Record<PlanId, PlanDefinition>> = {
  trial: {
    id: "trial",
    name: "Free trial",
    description: "Full access during the 14-day evaluation period.",
    monthlyPrice: 0,
    billingCycle: "monthly",
    trialDays: TRIAL_DURATION_DAYS,
    features: FEATURE_KEYS,
    // Commercial rationale: a single workspace can reasonably manage up to
    // 100 active inquiries and 200 follow-ups during evaluation. These are
    // validation figures, not a proven revenue model, and are configurable here.
    limits: { activeInquiries: 100, followUps: 200 },
    available: true,
    sortOrder: 0,
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "The initial commercial hypothesis for a single workspace.",
    monthlyPrice: 1500,
    billingCycle: "monthly",
    trialDays: TRIAL_DURATION_DAYS,
    features: FEATURE_KEYS,
    limits: { activeInquiries: 100, followUps: 200 },
    available: true,
    sortOrder: 1,
  },
  growth: {
    id: "growth",
    name: "Growth",
    description: "Reserved for a future release. Not yet available.",
    monthlyPrice: 0,
    billingCycle: "monthly",
    trialDays: 0,
    features: [],
    limits: { activeInquiries: 0, followUps: 0 },
    available: false,
    sortOrder: 2,
  },
};

export const PLAN_ORDER: readonly PlanId[] = ["trial", "starter", "growth"];

export function getPlan(id: PlanId): PlanDefinition {
  return PLANS[id];
}

/** Plans safe to display as purchasable options. */
export function availablePlans(): PlanDefinition[] {
  return PLAN_ORDER.map((id) => PLANS[id])
    .filter((plan) => plan.available && plan.id !== "trial")
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function formatPrice(plan: PlanDefinition): string {
  if (plan.monthlyPrice === 0) return "Included";
  return `${BILLING_CURRENCY} ${plan.monthlyPrice.toLocaleString()}/month`;
}
