import { createHash, randomUUID } from "node:crypto";
import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import {
  BILLING_CURRENCY,
  BILLING_INTERVAL,
  STARTER_MONTHLY_PRICE,
} from "./catalog";
import {
  billingStatusFor,
  checkoutSummary,
  isPurchaseEligible,
  isRenewalEligible,
  nextBillingPeriod,
  type CheckoutIntent,
  type CheckoutOutcome,
} from "./billing-shared";
import { adminDb } from "@/lib/server/firebase-admin";
import { CHECKOUT_INTENTS, CHECKOUT_OUTCOMES } from "./billing-shared";
import { SubscriptionError } from "./server";
import {
  isValidSubscription,
  parseSubscription,
  type FirestoreTime,
  type SubscriptionDocument,
  type SubscriptionRecord,
} from "./types";

/**
 * Internal simulated billing. No external provider, no real money.
 * All writes are performed with Firebase Admin; clients only send an intent,
 * a deterministic simulated outcome and an idempotency key. Prices, plan,
 * period and subscription state are derived on the server.
 */

export type CheckoutSession = {
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
  idempotencyKey: string;
  reference: string | null;
  resultStatus: string | null;
  createdAt: FirestoreTime;
  processedAt: FirestoreTime | null;
};

export type BillingRecord = {
  reference: string;
  workspaceId: string;
  sessionId: string;
  plan: "starter";
  amount: number;
  currency: string;
  billingInterval: "monthly";
  periodStart: FirestoreTime;
  periodEnd: FirestoreTime;
  status: "succeeded" | "failed" | "cancelled";
  type: CheckoutIntent;
  outcome: CheckoutOutcome;
  simulated: true;
  createdAt: FirestoreTime;
};

function checkouts(workspaceId: string) {
  return adminDb().collection("workspaces").doc(workspaceId).collection("checkouts");
}

function billing(workspaceId: string) {
  return adminDb().collection("workspaces").doc(workspaceId).collection("billing");
}

function sessionIdFor(workspaceId: string, idempotencyKey: string): string {
  return createHash("sha256").update(`${workspaceId}:${idempotencyKey}`).digest("hex").slice(0, 40);
}

function parseSession(snap: DocumentSnapshot): CheckoutSession | null {
  if (!snap.exists) return null;
  const data = snap.data() as CheckoutSession;
  return data;
}

function parseBilling(snap: DocumentSnapshot): BillingRecord {
  return snap.data() as BillingRecord;
}

function serializeSession(session: CheckoutSession) {
  return {
    ...session,
    createdAt: session.createdAt.toDate().toISOString(),
    processedAt: session.processedAt ? session.processedAt.toDate().toISOString() : null,
  };
}

export type CheckoutResult = {
  ok: boolean;
  status: "succeeded" | "failed" | "cancelled";
  reference: string;
  simulated: true;
  subscriptionChanged: boolean;
  message: string;
};

export async function createCheckoutSession(
  workspaceId: string,
  input: { intent: unknown; outcome: unknown; idempotencyKey: unknown }
): Promise<ReturnType<typeof serializeSession>> {
  if (!CHECKOUT_INTENTS.includes(input.intent as CheckoutIntent)) {
    throw new SubscriptionError("Unknown checkout intent.", 400);
  }
  if (!CHECKOUT_OUTCOMES.includes(input.outcome as CheckoutOutcome)) {
    throw new SubscriptionError("Unknown simulated outcome.", 400);
  }
  if (typeof input.idempotencyKey !== "string" || input.idempotencyKey.length < 16 || input.idempotencyKey.length > 100) {
    throw new SubscriptionError("Invalid checkout request.", 400);
  }
  const intent = input.intent as CheckoutIntent;
  const outcome = input.outcome as CheckoutOutcome;
  const db = adminDb();
  const current = await getSubscription(workspaceId);
  if (intent === "renewal" ? !isRenewalEligible(current) : !isPurchaseEligible(current)) {
    throw new SubscriptionError(intent === "renewal" ? "Renewal is not available yet." : "A new purchase is not available for this subscription.", 409);
  }

  const summary = checkoutSummary(intent);
  const id = sessionIdFor(workspaceId, input.idempotencyKey);
  const ref = checkouts(workspaceId).doc(id);
  const session = await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(ref);
    const existing = parseSession(snap);
    if (existing) return existing;
    const next: CheckoutSession = {
      sessionId: id,
      workspaceId,
      intent,
      outcome,
      plan: "starter",
      amount: summary.amount || STARTER_MONTHLY_PRICE,
      currency: summary.currency || BILLING_CURRENCY,
      billingInterval: BILLING_INTERVAL,
      simulated: true,
      status: "pending",
      idempotencyKey: input.idempotencyKey as string,
      reference: null,
      resultStatus: null,
      createdAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
      processedAt: null,
    };
    transaction.set(ref, next);
    return next;
  });
  return serializeSession(session);
}

export async function processCheckout(
  workspaceId: string,
  sessionIdRaw: unknown
): Promise<CheckoutResult> {
  if (typeof sessionIdRaw !== "string" || !/^[a-f0-9]{40}$/.test(sessionIdRaw)) {
    throw new SubscriptionError("Invalid checkout session.", 400);
  }
  const db = adminDb();
  const sessionRef = checkouts(workspaceId).doc(sessionIdRaw);
  const billingRef = billing(workspaceId).doc(sessionIdRaw);
  const subscriptionRef = db.collection("workspaces").doc(workspaceId).collection("subscription").doc("current");

  return db.runTransaction(async (transaction) => {
    const sessionSnap = await transaction.get(sessionRef);
    const session = parseSession(sessionSnap);
    if (!session) throw new SubscriptionError("Checkout session not found.", 404);
    if (session.workspaceId !== workspaceId) throw new SubscriptionError("Checkout session is not yours.", 403);
    if (session.status === "processed") {
      return {
        ok: session.resultStatus === "succeeded",
        status: (session.resultStatus ?? "cancelled") as CheckoutResult["status"],
        reference: session.reference ?? "",
        simulated: true as const,
        subscriptionChanged: false,
        message: session.resultStatus === "succeeded" ? "Simulated payment already processed." : "Checkout already completed.",
      };
    }

    const now = new Date();
    const reference = `SIM-${now.getTime().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const status = billingStatusFor(session.outcome);
    const currentSnap = await transaction.get(subscriptionRef);
    const current = currentSnap.exists
      ? parseSubscription(currentSnap.data() as SubscriptionDocument, subscriptionRef.id)
      : null;
    const period = nextBillingPeriod(session.intent, current, now);

    const record: BillingRecord = {
      reference,
      workspaceId,
      sessionId: session.sessionId,
      plan: "starter",
      amount: session.amount || STARTER_MONTHLY_PRICE,
      currency: session.currency || BILLING_CURRENCY,
      billingInterval: BILLING_INTERVAL,
      periodStart: Timestamp.fromDate(period.start),
      periodEnd: Timestamp.fromDate(period.end),
      status,
      type: session.intent,
      outcome: session.outcome,
      simulated: true,
      createdAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
    };
    transaction.set(billingRef, record);

    if (status === "succeeded") {
      const next: SubscriptionDocument = {
        subscriptionId: current?.subscriptionId ?? `sub_${workspaceId}_${now.getTime()}`,
        workspaceId,
        plan: "starter",
        status: "active",
        trialStartedAt: current?.trialStartedAt
          ? (Timestamp.fromDate(current.trialStartedAt) as unknown as FirestoreTime)
          : null,
        trialEndsAt: current?.trialEndsAt
          ? (Timestamp.fromDate(current.trialEndsAt) as unknown as FirestoreTime)
          : null,
        currentPeriodStartedAt: Timestamp.fromDate(period.start),
        currentPeriodEndsAt: Timestamp.fromDate(period.end),
        createdAt: current?.createdAt
          ? (Timestamp.fromDate(current.createdAt) as unknown as FirestoreTime)
          : (FieldValue.serverTimestamp() as unknown as FirestoreTime),
        updatedAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        provider: "simulated",
        providerCustomerId: null,
        providerSubscriptionId: reference,
      };
      if (!isValidSubscription(next)) throw new Error("Refusing to write an invalid subscription.");
      transaction.set(subscriptionRef, next);
    }

    transaction.update(sessionRef, {
      status: "processed",
      reference,
      resultStatus: status,
      processedAt: FieldValue.serverTimestamp(),
    });

    return {
      ok: status === "succeeded",
      status,
      reference,
      simulated: true as const,
      subscriptionChanged: status === "succeeded",
      message:
        status === "succeeded"
          ? "Simulated payment successful. Starter is now active."
          : status === "failed"
            ? "Simulated payment failed. No subscription changes were made."
            : "Checkout cancelled. No subscription changes were made.",
    };
  });
}

export async function getSubscription(workspaceId: string): Promise<SubscriptionRecord | null> {
  const snap = await adminDb()
    .collection("workspaces").doc(workspaceId).collection("subscription").doc("current").get();
  return snap.exists ? parseSubscription(snap.data() as SubscriptionDocument, snap.id) : null;
}

export async function listBillingHistory(workspaceId: string, limit = 50) {
  const snap = await billing(workspaceId).orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((doc) => {
    const record = parseBilling(doc);
    return {
      ...record,
      periodStart: record.periodStart.toDate().toISOString(),
      periodEnd: record.periodEnd.toDate().toISOString(),
      createdAt: record.createdAt.toDate().toISOString(),
    };
  });
}
