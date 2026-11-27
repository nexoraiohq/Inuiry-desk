import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import { isValidSubscription, parseSubscription, type FirestoreTime, type SubscriptionDocument } from "./types";

/**
 * Trusted server-only subscription lifecycle operations.
 *
 * No public API route calls activateStarter — that pathway is reserved for a
 * future payment-provider integration. Idempotency is enforced by comparing
 * authoritative stored state before every write.
 */

const DEFAULT_PERIOD_DAYS = 30;
const MAX_WORKSPACES_PER_SWEEP = 50;

export type ActivationInput = {
  workspaceId: string;
  provider: string | null;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  periodDays?: number;
  now?: Date;
};

/** Activates Starter from a trusted server pathway only. */
export async function activateStarter(db: Firestore, input: ActivationInput): Promise<boolean> {
  const now = input.now ?? new Date();
  const ref = db.collection("workspaces").doc(input.workspaceId).collection("subscription").doc("current");
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const existing = snap.exists ? parseSubscription(snap.data() as SubscriptionDocument, ref.id) : null;
    const periodEnd = new Date(now.getTime() + (input.periodDays ?? DEFAULT_PERIOD_DAYS) * 86_400_000);
    if (
      existing &&
      existing.plan === "starter" &&
      existing.status === "active" &&
      existing.providerSubscriptionId === input.providerSubscriptionId &&
      existing.currentPeriodEndsAt.getTime() === periodEnd.getTime()
    ) {
      return false; // idempotent
    }
    const next: SubscriptionDocument = {
      subscriptionId: existing?.subscriptionId ?? `sub_${input.workspaceId}_${now.getTime()}`,
      workspaceId: input.workspaceId,
      plan: "starter",
      status: "active",
      trialStartedAt: (existing?.trialStartedAt ?? null) as FirestoreTime | null,
      trialEndsAt: (existing?.trialEndsAt ? Timestamp.fromDate(existing.trialEndsAt) : null) as FirestoreTime | null,
      currentPeriodStartedAt: Timestamp.fromDate(now),
      currentPeriodEndsAt: Timestamp.fromDate(periodEnd),
      createdAt: (existing?.createdAt
        ? Timestamp.fromDate(existing.createdAt)
        : FieldValue.serverTimestamp()) as unknown as FirestoreTime,
      updatedAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      provider: input.provider,
      providerCustomerId: input.providerCustomerId,
      providerSubscriptionId: input.providerSubscriptionId,
    };
    if (!isValidSubscription(next)) throw new Error("Refusing to write an invalid subscription.");
    transaction.set(ref, next);
    return true;
  });
}

/** Marks a paid subscription to end at its current period end. */
export async function scheduleCancellationAtPeriodEnd(
  db: Firestore,
  workspaceId: string,
  now: Date = new Date()
): Promise<boolean> {
  const ref = db.collection("workspaces").doc(workspaceId).collection("subscription").doc("current");
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return false;
    const current = parseSubscription(snap.data() as SubscriptionDocument, ref.id);
    if (current.status !== "active" && current.status !== "past_due") return false;
    if (current.cancelAtPeriodEnd && current.cancelledAt) return false; // idempotent
    transaction.update(ref, {
      cancelAtPeriodEnd: true,
      cancelledAt: Timestamp.fromDate(now),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });
}

/** Idempotently expires records whose effective window has ended. */
export async function expireEndedSubscription(
  db: Firestore,
  workspaceId: string,
  now: Date = new Date()
): Promise<boolean> {
  const ref = db.collection("workspaces").doc(workspaceId).collection("subscription").doc("current");
  return db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists) return false;
    const current = parseSubscription(snap.data() as SubscriptionDocument, ref.id);
    if (current.status === "expired") return false;
    const trialEnded = current.status === "trialing" && (current.trialEndsAt?.getTime() ?? 0) <= now.getTime();
    const periodEnded = current.currentPeriodEndsAt.getTime() <= now.getTime() &&
      ["active", "past_due", "cancelled"].includes(current.status);
    if (!trialEnded && !periodEnded) return false;
    transaction.update(ref, { status: "expired", updatedAt: FieldValue.serverTimestamp() });
    return true;
  });
}

/** Bounded, repeatable lifecycle sweep for scheduled processing. */
export async function processSubscriptionLifecycle(
  db: Firestore,
  now: Date = new Date()
): Promise<{ scanned: number; expired: number }> {
  const workspaces = await db.collection("workspaces").limit(MAX_WORKSPACES_PER_SWEEP).get();
  let expired = 0;
  for (const workspace of workspaces.docs) {
    try {
      if (await expireEndedSubscription(db, workspace.id, now)) expired += 1;
    } catch (error) {
      console.error("[subscription] lifecycle workspace failed", {
        workspaceId: workspace.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { scanned: workspaces.size, expired };
}
