import { createHash } from "node:crypto";
import { FieldValue, Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb, verifyIdToken } from "@/lib/server/firebase-admin";
import {
  TRIAL_DURATION_DAYS,
  type FeatureKey,
} from "@/lib/subscription/catalog";
import {
  authorizeOperation,
  evaluateEntitlement,
  type EntitlementSnapshot,
} from "@/lib/subscription/entitlements";
import { measureWorkspaceUsage, type UsageSnapshot } from "@/lib/subscription/usage";
import {
  parseSubscription,
  type FirestoreTime,
  type SubscriptionDocument,
  type SubscriptionRecord,
  type SubscriptionSource,
} from "@/lib/subscription/types";

/** Only considered genuinely new inside this window after Auth creation. */
const NEW_ACCOUNT_WINDOW_MS = 10 * 60 * 1000;

export class SubscriptionError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SubscriptionError";
    this.status = status;
  }
}

export type VerifiedIdentity = {
  uid: string;
  email: string;
};

/** Verifies the Firebase ID token on the server — never trusts a client uid. */
export async function verifyRequestToken(request: Request): Promise<VerifiedIdentity> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7, header.length).trim() : "";
  if (!token) throw new SubscriptionError("Authentication required.", 401);
  try {
    return await verifyIdToken(token);
  } catch (error) {
    if (error instanceof SubscriptionError) throw error;
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
  kind: "trial" | "grandfathered";
  trialStartedAt: FirestoreTime | null;
  trialEndsAt: FirestoreTime | null;
  createdAt: FirestoreTime;
};

function time(value: unknown): Date | null {
  if (value && typeof (value as FirestoreTime).toDate === "function") {
    return (value as FirestoreTime).toDate();
  }
  return null;
}

/**
 * Creates the single canonical subscription record for a workspace.
 * Writes are performed with Firebase Admin inside a transaction so clients
 * cannot forge a trial, a plan, a status or a timestamp.
 */
export async function ensureSubscription(identity: VerifiedIdentity): Promise<SubscriptionRecord | null> {
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

  const emailHash = createHash("sha256").update(identity.email).digest("hex");
  const claimRef = db.collection("trialClaims").doc(emailHash);
  const ref = subscriptionRef(identity.uid);

  const result = await db.runTransaction(async (transaction) => {
    const [existing, claimSnap] = await Promise.all([
      transaction.get(ref),
      transaction.get(claimRef),
    ]);
    const existingSubscription = await readSubscription(existing);
    if (existingSubscription) return existingSubscription;

    const now = new Date();
    const claim = claimSnap.exists ? (claimSnap.data() as TrialClaim) : null;
    // The workspace timestamp is written with Firestore serverTimestamp() at
    // registration, so this check never depends on a client clock.
    const isNewWorkspace = Boolean(
      workspaceCreatedAt && now.getTime() - workspaceCreatedAt.getTime() <= NEW_ACCOUNT_WINDOW_MS
    );

    let planId: SubscriptionRecord["planId"] = "starter";
    let status: SubscriptionRecord["status"] = "grandfathered";
    let source: SubscriptionSource = "phase10_grandfathered";
    let trialStart: Date | null = null;
    let trialEnd: Date | null = null;
    let claimKind: TrialClaim["kind"] = "grandfathered";

    if (claim) {
      source = "phase10_recovery";
      claimKind = claim.kind;
      trialStart = time(claim.trialStartedAt);
      trialEnd = time(claim.trialEndsAt);
      if (claim.kind === "trial" && trialEnd && trialEnd.getTime() > now.getTime()) {
        planId = "trial";
        status = "trialing";
      } else if (claim.kind === "trial") {
        planId = "trial";
        status = "expired";
      } else {
        planId = "starter";
        status = "grandfathered";
      }
    } else if (isNewWorkspace) {
      planId = "trial";
      status = "trialing";
      source = "phase10_trial";
      claimKind = "trial";
      // Absolute server timestamps only. No client clock is consulted.
      trialStart = now;
      trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 86_400_000);
    }

    const record: SubscriptionDocument = {
      subscriptionId: `sub_${identity.uid}_${now.getTime()}`,
      workspaceId: identity.uid,
      planId,
      status,
      billingCycle: "monthly",
      trialStartedAt: trialStart ? Timestamp.fromDate(trialStart) : null,
      trialEndsAt: trialEnd ? Timestamp.fromDate(trialEnd) : null,
      currentPeriodStart: Timestamp.fromDate(now),
      currentPeriodEnd: trialEnd
        ? Timestamp.fromDate(trialEnd)
        : Timestamp.fromDate(new Date(now.getTime() + 30 * 86_400_000)),
      createdAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
      updatedAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
      cancelledAt: null,
      gracePeriodEndsAt: null,
      source,
      metadata: {
        phase: "10.1",
        trialDays: TRIAL_DURATION_DAYS,
        workspaceAgeSeconds: workspaceCreatedAt
          ? Math.round((now.getTime() - workspaceCreatedAt.getTime()) / 1000)
          : null,
      },
    };
    transaction.set(ref, record);
    if (!claim) {
      const newClaim: TrialClaim = {
        emailHash,
        workspaceId: identity.uid,
        kind: claimKind,
        trialStartedAt: trialStart ? Timestamp.fromDate(trialStart) : null,
        trialEndsAt: trialEnd ? Timestamp.fromDate(trialEnd) : null,
        createdAt: FieldValue.serverTimestamp() as unknown as FirestoreTime,
      };
      transaction.set(claimRef, newClaim);
    }
    return parseSubscription(record, ref.id);
  });

  return result;
}

export type SubscriptionState = {
  subscription: ReturnType<typeof serializeSubscription>;
  entitlement: EntitlementSnapshot;
  usage: ReturnType<typeof serializeUsage>;
};

function serializeSubscription(record: SubscriptionRecord | null) {
  if (!record) return null;
  return {
    ...record,
    trialStartedAt: record.trialStartedAt?.toISOString() ?? null,
    trialEndsAt: record.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: record.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: record.currentPeriodEnd?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    cancelledAt: record.cancelledAt?.toISOString() ?? null,
    gracePeriodEndsAt: record.gracePeriodEndsAt?.toISOString() ?? null,
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

export async function getSubscriptionState(identity: VerifiedIdentity): Promise<SubscriptionState> {
  const subscription = await getSubscriptionRecord(identity.uid);
  const entitlement = evaluateEntitlement(subscription);
  const usage = await measureWorkspaceUsage(adminDb(), identity.uid);
  return {
    subscription: serializeSubscription(subscription),
    entitlement,
    usage: serializeUsage(usage),
  };
}

/**
 * Authoritative server-side gate for privileged operations.
 * Callers must use this result; a hidden UI control is never an enforcement.
 */
export async function requireEntitlement(
  identity: VerifiedIdentity,
  feature: FeatureKey,
  usage?: UsageSnapshot
): Promise<{ entitlement: EntitlementSnapshot; usage: UsageSnapshot }> {
  const subscription = await getSubscriptionRecord(identity.uid);
  const entitlement = evaluateEntitlement(subscription);
  const currentUsage = usage ?? (await measureWorkspaceUsage(adminDb(), identity.uid));
  const decision = authorizeOperation(entitlement, feature, currentUsage);
  if (!decision.allowed) throw new SubscriptionError(decision.reason, 403);
  return { entitlement, usage: currentUsage };
}
