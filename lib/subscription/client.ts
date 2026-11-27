import { auth } from "@/lib/firebase";
import type { CheckoutIntent, CheckoutOutcome } from "@/lib/subscription/billing-shared";
import type { SubscriptionStateView } from "@/lib/subscription/view";

async function token(): Promise<string> {
  const value = auth ? await auth.currentUser?.getIdToken() : null;
  if (!value) throw new Error("Sign in to manage your subscription.");
  return value;
}

async function readError(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? fallback;
}

/** Reads subscription state from the authenticated server route. */
export async function fetchSubscriptionState(): Promise<SubscriptionStateView> {
  const value = await token();
  const response = await fetch("/api/subscription/state", {
    headers: { authorization: `Bearer ${value}` },
  });
  const payload = (await response.json()) as SubscriptionStateView & { error?: string };
  if (!response.ok) throw new Error(payload.error ?? "Could not load subscription information.");
  return payload;
}

export type CheckoutSessionView = {
  sessionId: string;
  workspaceId: string;
  intent: CheckoutIntent;
  outcome: CheckoutOutcome;
  plan: "starter";
  amount: number;
  currency: string;
  billingInterval: "monthly";
  simulated: true;
  status: "pending" | "processed";
  reference: string | null;
  resultStatus: string | null;
  createdAt: string;
  processedAt: string | null;
};

export type CheckoutResultView = {
  ok: boolean;
  status: "succeeded" | "failed" | "cancelled";
  reference: string;
  simulated: true;
  subscriptionChanged: boolean;
  message: string;
};

export type BillingRecordView = {
  reference: string;
  workspaceId: string;
  sessionId: string;
  plan: "starter";
  amount: number;
  currency: string;
  billingInterval: "monthly";
  periodStart: string;
  periodEnd: string;
  status: "succeeded" | "failed" | "cancelled";
  type: CheckoutIntent;
  outcome: CheckoutOutcome;
  simulated: true;
  createdAt: string;
};

export async function createCheckout(
  intent: CheckoutIntent,
  outcome: CheckoutOutcome,
  idempotencyKey: string
): Promise<CheckoutSessionView> {
  const value = await token();
  const response = await fetch("/api/subscription/checkout", {
    method: "POST",
    headers: { authorization: `Bearer ${value}`, "content-type": "application/json" },
    body: JSON.stringify({ intent, outcome, idempotencyKey }),
  });
  if (!response.ok) throw new Error(await readError(response, "Could not start checkout."));
  const payload = (await response.json()) as { session: CheckoutSessionView };
  return payload.session;
}

export async function completeCheckout(sessionId: string): Promise<CheckoutResultView> {
  const value = await token();
  const response = await fetch("/api/subscription/checkout/complete", {
    method: "POST",
    headers: { authorization: `Bearer ${value}`, "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
  });
  if (!response.ok) throw new Error(await readError(response, "Could not complete checkout."));
  return (await response.json()) as CheckoutResultView;
}

export async function cancelSubscription(): Promise<{ changed: boolean }> {
  const value = await token();
  const response = await fetch("/api/subscription/cancel", {
    method: "POST",
    headers: { authorization: `Bearer ${value}` },
  });
  if (!response.ok) throw new Error(await readError(response, "Could not schedule cancellation."));
  return (await response.json()) as { changed: boolean };
}

export async function fetchBillingHistory(): Promise<BillingRecordView[]> {
  const value = await token();
  const response = await fetch("/api/subscription/billing", {
    headers: { authorization: `Bearer ${value}` },
  });
  if (!response.ok) throw new Error(await readError(response, "Could not load billing history."));
  const payload = (await response.json()) as { transactions: BillingRecordView[] };
  return payload.transactions;
}

/** Explicit trial bootstrap for a genuinely new workspace, called after registration. */
export async function initializeSubscription(): Promise<void> {
  const value = auth ? await auth.currentUser?.getIdToken() : null;
  if (!value) return;
  const response = await fetch("/api/subscription/trial", {
    method: "POST",
    headers: { authorization: `Bearer ${value}` },
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Could not start the trial.");
  }
}
