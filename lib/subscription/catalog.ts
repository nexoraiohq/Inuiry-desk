/**
 * Centralized commercial catalog. Prices, trial duration, features and
 * billing interval live here only — never scattered through components.
 *
 * Placeholder provider fields stay null in Phase 10.1. This module is public
 * display configuration; no privileged internal values are stored here.
 */
import type { BillingInterval, Plan } from "./types";

export const TRIAL_DURATION_DAYS = 14;
export const BILLING_CURRENCY = "KES";
export const BILLING_INTERVAL: BillingInterval = "monthly";
export const STARTER_MONTHLY_PRICE = 1500;

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

export type PlanCatalogEntry = {
  plan: Plan;
  name: string;
  description: string;
  /** Monthly amount in KES. Trial is zero. */
  monthlyPrice: number;
  billingInterval: BillingInterval;
  features: readonly FeatureKey[];
};

export const PLAN_CATALOG: Readonly<Record<Plan, PlanCatalogEntry>> = {
  trial: {
    plan: "trial",
    name: "Free trial",
    description: "Full Starter feature set during the 14-day evaluation period.",
    monthlyPrice: 0,
    billingInterval: BILLING_INTERVAL,
    features: FEATURE_KEYS,
  },
  starter: {
    plan: "starter",
    name: "Starter",
    description: "The initial monthly plan for a single workspace.",
    monthlyPrice: STARTER_MONTHLY_PRICE,
    billingInterval: BILLING_INTERVAL,
    features: FEATURE_KEYS,
  },
};

export const PLAN_ORDER: readonly Plan[] = ["trial", "starter"];

export function getPlan(plan: Plan): PlanCatalogEntry {
  return PLAN_CATALOG[plan];
}

export function formatPrice(plan: Plan): string {
  const entry = getPlan(plan);
  if (entry.monthlyPrice === 0) return "No payment required";
  return `${BILLING_CURRENCY} ${entry.monthlyPrice.toLocaleString()}/${entry.billingInterval}`;
}
