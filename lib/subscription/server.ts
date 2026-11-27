import { createHash } from "node:crypto";
import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb, verifyIdToken } from "@/lib/server/firebase-admin";
import { BILLING_INTERVAL, TRIAL_DURATION_DAYS, type FeatureKey } from "@/lib/subscription/catalog";
import { authorizeAccess, evaluateEntitlement, type EntitlementSnapshot } from "@/lib/subscription/entitlements";
import { scheduleCancellationAtPeriodEnd } from "@/lib/subscription/lifecycle";
import { measureWorkspaceUsage, type UsageSnapshot } from "@/lib/subscription/usage";
import {
  parseSubscription,
  type FirestoreTime,
  type SubscriptionDocument,
  type SubscriptionRecord,
} from "@/lib/subscription/types";

/** A workspace is "new" only within this window of its server-written creation. */
const NEW_WORKSPACE_WINDOW_MS = 10 * 60 * 1000;

export class SubscriptionError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SubscriptionError";
    this.status = status;
  }
}

export type VerifiedIdentity = { uid: string; email: string };

/** Verifies the Firebase ID token on the server — no client uid is trusted. */
export async function verifyRequestToken(request: Request): Promise<VerifiedIdentity> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7, header.length).trim() : "";
  if (!token) throw new SubscriptionError("Authentication required.", 401);
  try {
    return await verifyIdToken(token);
  } catch {
    throw new SubscriptionError("Invalid authentication token.", 401);
  }
}

function subscriptionRef(uid: string) {
  return adminDb().collection("workspaces").doc(uid).collection("subscription").doc("current");
}

async function readSubscription(snapshot: DocumentSnapshot): Promise<SubscriptionRecord | null> {
  if (!snapshot.exists) return null;
  return parseSubscription(snapshot.data() as SubscriptionDocument, snapshot.id);
}

export async function getSubscriptionRecord(uid: string): Promise<SubscriptionRecord | null> {
  return readSubscription(await subscriptionRef(uid).get());
}

type TrialClaim = {
  emailHash: string;
  workspaceId: string;
  trialStartedAt: FirestoreTime;
  trialEndsAt: FirestoreTime;
  createdAt: FirestoreTime;
};

function time(value: unknown): Date | null {
  if (value && typeof (value as FirestoreTime).toDate === "function") {
    return (value as FirestoreTime).toDate();
  }
  return null;
}

/**
 * Provisions a 14-day trial for a genuinely new workspace in one Admin
 * transaction. Existing workspaces are never given a new trial; their missing
 * record is handled by the grandfathering policy in the entitlement engine.
 */
export async function ensureTrialForNewWorkspace(identity: VerifiedIdentity): Promise<SubscriptionRecord | null> {
  const db = adminDb();
  const workspaceRef = db.collection("workspaces").doc(identity.uid);
  const workspace = await workspaceRef.get();
  const workspaceData = workspace.data() as Record<string, unknown> | undefined;
  if (!workspace.exists || !workspaceData || workspaceData.ownerUid !== identity.uid) {
    throw new SubscriptionError("Workspace ownership could not be verified.", 403);
  }
  const workspaceCreated = workspaceData.createdAt;
  const workspaceCreatedAt = workspaceCreated && typeof (workspaceCreated as FirestoreTime).toDate === "function"
    ? (workspaceCreated as FirestoreTime).toDate()
    : null;
  const isNewWorkspace = Boolean(
    workspaceCreatedAt && Date.now() - workspaceCreatedAt.getTime() <= NEW_WORKSPACE_WINDOW_MS
  );
  if (!isNewWorkspace) {
    // Legacy workspace: preserve access, do not write a subscription record.
    return null;
  }

  const emailHash = createHash("sha256").update(identity.email).digest("hex");
  const claimRef = db.collection("trialClaims").doc(emailHash);
  const ref = subscriptionRef(identity.uid);

  return db.runTransaction(async (transaction) => {
    const [existing, claimSnap] = await Promise.all([transaction.get(ref), transaction.get(claimRef)]);
    const existingSubscription = await readSubscription(existing);
    if (existingSubscription) return existingSubscription;

    const now = new Date();
    const claim = claimSnap.exists ? (claimSnap.data() as TrialClaim) : null;
    const trialStart = claim ? time(claim.trialStartedAt) ?? now : now;
    const trialEnd = claim
      ? time(claim.trialEndsAt) ?? new Date(trialStart.getTime() + TRIAL_DURATION_DAYS * 86_400_000)
      : new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000);
    const status = trialEnd.getTime() > now.getTime() ? "trialing" : "expired";

    const record: SubscriptionDocument = {
      subscriptionId: `sub_${identity.uid}_${now.getTime()}`,
      workspaceId: identity.uid,
      plan: "trial",
      status,
      trialStartedAt: Timestamp.fromDate(trialStart),
      trialEndsAt: Timestamp.fromDate(trialEnd),
      currentPeriodStartedAt: Timestamp.fromDate(trialStart),
      currentPeriodEndsAt: Timestamp.fromDate(trialEnd),
      createdAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
      updatedAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      provider: null,
      providerCustomerId: null,
      providerSubscriptionId: null,
    };
    transaction.set(ref, record);
    if (!claim) {
      transaction.set(claimRef, {
        emailHash,
        workspaceId: identity.uid,
        trialStartedAt: Timestamp.fromDate(trialStart),
        trialEndsAt: Timestamp.fromDate(trialEnd),
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    return parseSubscription(record, ref.id);
  });
}

function serializeSubscription(record: SubscriptionRecord | null) {
  if (!record) return null;
  return {
    ...record,
    billingInterval: BILLING_INTERVAL,
    trialStartedAt: record.trialStartedAt?.toISOString() ?? null,
    trialEndsAt: record.trialEndsAt?.toISOString() ?? null,
    currentPeriodStartedAt: record.currentPeriodStartedAt.toISOString(),
    currentPeriodEndsAt: record.currentPeriodEndsAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
  };
}

function serializeUsage(usage: UsageSnapshot) {
  return {
    ...usage,
    measuredAt: usage.measuredAt.toISOString(),
    periodStart: usage.periodStart.toISOString(),
    periodEnd: usage.periodEnd.toISOString(),
  };
}

export async function getSubscriptionState(identity: VerifiedIdentity) {
  const subscription = await getSubscriptionRecord(identity.uid);
  const entitlement = evaluateEntitlement(subscription);
  const usage = await measureWorkspaceUsage(adminDb(), identity.uid);
  return {
    subscription: serializeSubscription(subscription),
    entitlement,
    usage: serializeUsage(usage),
  };
}

/** Authoritative server-side gate for protected operations. */
export async function requireEntitlement(
  identity: VerifiedIdentity,
  feature: FeatureKey
): Promise<{ entitlement: EntitlementSnapshot }> {
  const subscription = await getSubscriptionRecord(identity.uid);
  const entitlement = evaluateEntitlement(subscription);
  const decision = authorizeAccess(entitlement, feature);
  if (!decision.allowed) throw new SubscriptionError(decision.reason, 403);
  return { entitlement };
}

/** Owner-requested cancellation scheduling; never changes status to active. */
export async function requestCancellation(identity: VerifiedIdentity): Promise<boolean> {
  return scheduleCancellationAtPeriodEnd(adminDb(), identity.uid);
}
