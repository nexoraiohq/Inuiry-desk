import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";

/**
 * Live production verification of Phase 10.1 using controlled test workspaces.
 * Requires server-only environment variables supplied by the operator:
 *   FA_PROJECT, FA_EMAIL, FA_KEY, FIREBASE_API_KEY, APP_URL
 *
 * No values are read from or written to the repository. Temp credentials and
 * test records are removed by the caller/finally block.
 */
const OUT = ".test-build-live";
rmSync(OUT, { recursive: true, force: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
execFileSync(
  npx,
  [
    "tsc",
    "lib/subscription/types.ts",
    "lib/subscription/lifecycle.ts",
    "--outDir",
    OUT,
    "--rootDir",
    "lib/subscription",
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--moduleResolution",
    "node",
    "--skipLibCheck",
    "--esModuleInterop",
  ],
  { stdio: "inherit", shell: process.platform === "win32" }
);

const require = createRequire(import.meta.url);
const { activateStarter, scheduleCancellationAtPeriodEnd, expireEndedSubscription } = require(
  `../${OUT}/lifecycle.js`
);
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
const auth = getAuth();
const APP = process.env.APP_URL ?? "https://inuiry-desk.vercel.app";
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${process.env.FA_PROJECT}/databases/(default)/documents`;
const PASSWORD = "Phase101LiveTest!";

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
  const email = `phase101live-${label}-${suffix}@example.test`;
  const user = await auth.createUser({ email, password: PASSWORD });
  await db.collection("workspaces").doc(user.uid).set({
    businessName: "Phase 10.1 live verification",
    ownerUid: user.uid,
    createdAt: Timestamp.fromDate(createdAt),
    updatedAt: Timestamp.fromDate(createdAt),
    followUpSettings: { reminders: { remindersEnabled: true } },
  });
  return { uid: user.uid, email };
}

async function removeWorkspace(uid, email) {
  const ws = db.collection("workspaces").doc(uid);
  for (const name of ["subscription", "inquiries", "followUps", "activities", "communications"]) {
    const snap = await ws.collection(name).get();
    for (const doc of snap.docs) await doc.ref.delete();
  }
  await ws.delete();
  await auth.deleteUser(uid);
  const crypto = await import("node:crypto");
  await db.collection("trialClaims").doc(crypto.createHash("sha256").update(email).digest("hex")).delete();
}

(async () => {
  const suffix = Date.now();
  const now = new Date();
  const old = new Date(now.getTime() - 30 * 86_400_000);
  const a = await makeWorkspace("a", suffix, now);
  const b = await makeWorkspace("b", suffix, old);
  const c = await makeWorkspace("c", suffix, now);
  const results = {};
  try {
    const tokenA = await tokenFor(a.email);
    const tokenB = await tokenFor(b.email);
    const tokenC = await tokenFor(c.email);

    const fresh = await api("/api/subscription/state", tokenA);
    results.newTrialStatus = fresh.payload?.entitlement?.status;
    results.newTrialPlan = fresh.payload?.subscription?.plan;
    results.newTrialDays = fresh.payload?.entitlement?.daysRemaining;
    results.providerFieldsNull = [
      fresh.payload?.subscription?.provider,
      fresh.payload?.subscription?.providerCustomerId,
      fresh.payload?.subscription?.providerSubscriptionId,
    ].every((value) => value === null);
    results.idempotentState =
      (await api("/api/subscription/state", tokenA)).payload?.subscription?.subscriptionId ===
      fresh.payload?.subscription?.subscriptionId;

    const legacy = await api("/api/subscription/state", tokenB);
    results.legacyStatus = legacy.payload?.entitlement?.status;
    results.legacySubscription = legacy.payload?.subscription;
    results.legacyAccess = (await api("/api/subscription/access", tokenB, "POST", { feature: "inquiries" })).status;

    const patch = await fetch(
      `${FIRESTORE}/workspaces/${a.uid}/subscription/current?updateMask.fieldPaths=status`,
      {
        method: "PATCH",
        headers: { authorization: `Bearer ${tokenA}`, "content-type": "application/json" },
        body: JSON.stringify({ fields: { status: { stringValue: "active" } } }),
      }
    );
    results.clientStatusWrite = patch.status;
    const cross = await fetch(`${FIRESTORE}/workspaces/${b.uid}/subscription/current`, {
      headers: { authorization: `Bearer ${tokenA}` },
    });
    results.crossWorkspaceRead = cross.status;

    await db.collection("workspaces").doc(a.uid).collection("subscription").doc("current").update({
      trialEndsAt: Timestamp.fromDate(new Date(now.getTime() - 86_400_000)),
    });
    const expired = await api("/api/subscription/state", tokenA);
    results.expiredStatus = expired.payload?.entitlement?.status;
    results.expiredAccess = (await api("/api/subscription/access", tokenA, "POST", { feature: "inquiries" })).status;

    const activationAt = new Date(now.getTime());
    results.activationFirst = await activateStarter(db, { workspaceId: c.uid, provider: null, providerCustomerId: null, providerSubscriptionId: null, now: activationAt });
    results.activationRepeat = await activateStarter(db, { workspaceId: c.uid, provider: null, providerCustomerId: null, providerSubscriptionId: null, now: activationAt });
    const active = await api("/api/subscription/state", tokenC);
    results.activatedStatus = active.payload?.entitlement?.status;
    results.activatedAccess = (await api("/api/subscription/access", tokenC, "POST", { feature: "reports" })).status;

    results.cancelFirst = await scheduleCancellationAtPeriodEnd(db, c.uid, activationAt);
    results.cancelRepeat = await scheduleCancellationAtPeriodEnd(db, c.uid, activationAt);
    const cancelled = await api("/api/subscription/state", tokenC);
    results.cancelledStatus = cancelled.payload?.entitlement?.status;
    results.cancelledAccessBeforePeriodEnd = (await api("/api/subscription/access", tokenC, "POST", { feature: "inquiries" })).status;

    results.expireFirst = await expireEndedSubscription(db, c.uid, new Date(now.getTime() + 31 * 86_400_000));
    results.expireRepeat = await expireEndedSubscription(db, c.uid, new Date(now.getTime() + 31 * 86_400_000));
    const ended = await api("/api/subscription/state", tokenC);
    results.endedStatus = ended.payload?.entitlement?.status;
    results.endedAccess = (await api("/api/subscription/access", tokenC, "POST", { feature: "inquiries" })).status;

    for (let i = 0; i < 2; i += 1) {
      await db.collection("workspaces").doc(a.uid).collection("inquiries").doc(`v-${i}`).set({
        fullName: "Test", phone: "+100000000", service: "Test", source: "website", status: "new",
        priority: "normal", archived: false, createdByUid: a.uid,
        createdAt: Timestamp.fromDate(now), updatedAt: Timestamp.fromDate(now),
      });
    }
    const usage = await api("/api/subscription/state", tokenA);
    results.usageActive = usage.payload?.usage?.activeInquiries;
  } finally {
    await removeWorkspace(a.uid, a.email);
    await removeWorkspace(b.uid, b.email);
    await removeWorkspace(c.uid, c.email);
  }
  rmSync(OUT, { recursive: true, force: true });
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => {
  rmSync(OUT, { recursive: true, force: true });
  console.error(JSON.stringify({ testError: String(error && error.message ? error.message : error) }));
  process.exitCode = 1;
});
