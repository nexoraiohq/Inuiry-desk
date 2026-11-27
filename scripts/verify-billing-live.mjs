import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";

/**
 * Live verification of simulated billing with controlled test workspaces.
 * Requires FA_PROJECT, FA_EMAIL, FA_KEY, FIREBASE_API_KEY, APP_URL.
 * No credentials or test data are written to the repository.
 */
const require = createRequire(import.meta.url);
const { cert, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

initializeApp({
  credential: cert({
    projectId: process.env.FA_PROJECT,
    clientEmail: process.env.FA_EMAIL,
    privateKey: process.env.FA_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();
const authClient = getAuth();
const APP = process.env.APP_URL ?? "https://inuiry-desk.vercel.app";
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${process.env.FA_PROJECT}/databases/(default)/documents`;
const PASSWORD = "Phase102LiveTest!";

async function tokenFor(email) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, returnSecureToken: true }),
    }
  );
  const json = await res.json();
  assert.ok(res.ok, `sign-in failed: ${JSON.stringify(json)}`);
  return json.idToken;
}

async function api(path, token, method = "GET", body) {
  const res = await fetch(`${APP}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, payload: await res.json().catch(() => null) };
}

async function makeWorkspace(label, suffix, createdAt) {
  const email = `phase102live-${label}-${suffix}@example.test`;
  const user = await authClient.createUser({ email, password: PASSWORD });
  await db.collection("workspaces").doc(user.uid).set({
    businessName: "Phase 10.2 live verification",
    ownerUid: user.uid,
    createdAt: Timestamp.fromDate(createdAt),
    updatedAt: Timestamp.fromDate(createdAt),
    followUpSettings: { reminders: { remindersEnabled: true } },
  });
  return { uid: user.uid, email };
}

async function removeWorkspace(workspace) {
  const ws = db.collection("workspaces").doc(workspace.uid);
  for (const name of ["subscription", "checkouts", "billing", "inquiries", "followUps", "activities", "communications"]) {
    const snap = await ws.collection(name).get();
    for (const doc of snap.docs) await doc.ref.delete();
  }
  await ws.delete();
  await authClient.deleteUser(workspace.uid);
  const { createHash } = await import("node:crypto");
  await db.collection("trialClaims").doc(createHash("sha256").update(workspace.email).digest("hex")).delete();
}

async function checkout(token, intent, outcome, key, extra = {}) {
  return api("/api/subscription/checkout", token, "POST", {
    intent, outcome, idempotencyKey: key, ...extra,
  });
}

(async () => {
  const suffix = Date.now();
  const now = new Date();
  const a = await makeWorkspace("a", suffix, now);
  const b = await makeWorkspace("b", suffix, new Date(now.getTime() - 30 * 86_400_000));
  const results = {};
  try {
    const tokenA = await tokenFor(a.email);
    const tokenB = await tokenFor(b.email);

    results.invalidAuth = (await api("/api/subscription/billing", "")).status;
    results.manipulatedInputRejected = (await checkout(tokenA, "purchase", "success", randomUUID(), { amount: 1, plan: "growth", status: "active" })).status === 200 &&
      (await api("/api/subscription/state", tokenA)).payload?.subscription?.plan === "trial";

    const keySuccess = randomUUID();
    const sessionSuccess = await checkout(tokenA, "purchase", "success", keySuccess);
    assert.ok(sessionSuccess.status === 200 && sessionSuccess.payload?.session,
      `success checkout failed: ${JSON.stringify(sessionSuccess)}`);
    results.sessionCreated = sessionSuccess.payload.session.status === "pending";
    results.serverPrice = sessionSuccess.payload?.session?.amount;
    const completeSuccess = await api("/api/subscription/checkout/complete", tokenA, "POST", { sessionId: sessionSuccess.payload.session.sessionId });
    results.successStatus = completeSuccess.payload?.status;
    results.successRef = Boolean(completeSuccess.payload?.reference);
    const stateAfterSuccess = await api("/api/subscription/state", tokenA);
    results.activatedPlan = stateAfterSuccess.payload?.subscription?.plan;
    results.activatedStatus = stateAfterSuccess.payload?.entitlement?.status;
    results.accessAfterSuccess = (await api("/api/subscription/access", tokenA, "POST", { feature: "inquiries" })).status;
    const periodAfterSuccess = stateAfterSuccess.payload?.subscription?.currentPeriodEndsAt;

    const repeatComplete = await api("/api/subscription/checkout/complete", tokenA, "POST", { sessionId: sessionSuccess.payload.session.sessionId });
    results.repeatCompleteSameRef = repeatComplete.payload?.reference === completeSuccess.payload?.reference;
    results.repeatPeriodUnchanged =
      (await api("/api/subscription/state", tokenA)).payload?.subscription?.currentPeriodEndsAt === periodAfterSuccess;
    const repeatCreate = await checkout(tokenA, "purchase", "success", keySuccess);
    results.repeatSessionSameId = repeatCreate.payload?.session?.sessionId === sessionSuccess.payload?.session?.sessionId;

    const fail = await checkout(tokenA, "purchase", "failure", randomUUID());
    const failResult = await api("/api/subscription/checkout/complete", tokenA, "POST", { sessionId: fail.payload.session.sessionId });
    results.failedStatus = failResult.payload?.status;
    results.failedNoExtension =
      (await api("/api/subscription/state", tokenA)).payload?.subscription?.currentPeriodEndsAt === periodAfterSuccess;

    const cancel = await checkout(tokenA, "purchase", "cancel", randomUUID());
    const cancelResult = await api("/api/subscription/checkout/complete", tokenA, "POST", { sessionId: cancel.payload.session.sessionId });
    results.cancelledStatus = cancelResult.payload?.status;
    results.cancelledNoExtension =
      (await api("/api/subscription/state", tokenA)).payload?.subscription?.currentPeriodEndsAt === periodAfterSuccess;

    const renewal = await checkout(tokenA, "renewal", "success", randomUUID());
    const renewalResult = await api("/api/subscription/checkout/complete", tokenA, "POST", { sessionId: renewal.payload.session.sessionId });
    const stateAfterRenewal = await api("/api/subscription/state", tokenA);
    results.renewalStatus = renewalResult.payload?.status;
    results.renewalExtended =
      new Date(stateAfterRenewal.payload.subscription.currentPeriodEndsAt).getTime() >
      new Date(periodAfterSuccess).getTime();

    const history = await api("/api/subscription/billing", tokenA);
    results.historyCount = history.payload?.transactions?.length;
    results.historyStatuses = history.payload?.transactions?.map((item) => item.status).sort();
    results.historyAllSimulated = history.payload?.transactions?.every((item) => item.simulated === true);

    const crossHistory = await api("/api/subscription/billing", tokenA);
    results.crossWorkspaceOwnHistory = crossHistory.status;
    const crossSession = await api("/api/subscription/checkout/complete", tokenA, "POST", { sessionId: "f".repeat(40) });
    results.foreignSessionRejected = crossSession.status;

    const billingWrite = await fetch(
      `${FIRESTORE}/workspaces/${a.uid}/billing/${sessionSuccess.payload.session.sessionId}`,
      {
        method: "PATCH",
        headers: { authorization: `Bearer ${tokenA}`, "content-type": "application/json" },
        body: JSON.stringify({ fields: { status: { stringValue: "succeeded" } } }),
      }
    );
    results.clientBillingWrite = billingWrite.status;
    const crossBillingRead = await fetch(`${FIRESTORE}/workspaces/${b.uid}/billing/any`, {
      headers: { authorization: `Bearer ${tokenA}` },
    });
    results.crossBillingRead = crossBillingRead.status;

    // Grandfathered workspace can purchase through the same trusted pathway.
    const legacyPurchase = await checkout(tokenB, "purchase", "success", randomUUID());
    const legacyResult = await api("/api/subscription/checkout/complete", tokenB, "POST", { sessionId: legacyPurchase.payload.session.sessionId });
    results.grandfatheredPurchase = legacyResult.payload?.status;
    results.grandfatheredAccess = (await api("/api/subscription/access", tokenB, "POST", { feature: "reports" })).status;

    // Expiry then restoration through another simulated purchase.
    await db.collection("workspaces").doc(a.uid).collection("subscription").doc("current").update({
      currentPeriodEndsAt: Timestamp.fromDate(new Date(now.getTime() - 86_400_000)),
    });
    results.expiredAccess = (await api("/api/subscription/access", tokenA, "POST", { feature: "inquiries" })).status;
    const restore = await checkout(tokenA, "purchase", "success", randomUUID());
    const restoreResult = await api("/api/subscription/checkout/complete", tokenA, "POST", { sessionId: restore.payload.session.sessionId });
    results.restoredStatus = restoreResult.payload?.status;
    results.restoredAccess = (await api("/api/subscription/access", tokenA, "POST", { feature: "inquiries" })).status;
  } finally {
    await removeWorkspace(a);
    await removeWorkspace(b);
  }
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  console.error(JSON.stringify({ testError: String(error && error.message ? error.message : error) }));
  process.exitCode = 1;
});
