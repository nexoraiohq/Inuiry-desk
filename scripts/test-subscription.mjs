import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { rmSync } from "node:fs";

/**
 * Unit tests for the authoritative entitlement logic. No external services,
 * no credentials, no network. The pure modules are compiled with the project's
 * existing TypeScript compiler into a temporary directory.
 */
const OUT = ".test-build";
rmSync(OUT, { recursive: true, force: true });
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
execFileSync(
  npx,
  [
    "tsc",
    "lib/subscription/types.ts",
    "lib/subscription/catalog.ts",
    "lib/subscription/entitlements.ts",
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
const { evaluateEntitlement, authorizeAccess, canUseFeature } = require(`../${OUT}/entitlements.js`);
const { PLAN_CATALOG, TRIAL_DURATION_DAYS, STARTER_MONTHLY_PRICE, BILLING_CURRENCY, BILLING_INTERVAL } =
  require(`../${OUT}/catalog.js`);

const now = new Date("2026-06-15T12:00:00.000Z");
const day = 86_400_000;
const base = {
  subscriptionId: "sub_test",
  workspaceId: "ws_test",
  createdAt: new Date(now.getTime() - 30 * day),
  updatedAt: new Date(now.getTime() - 30 * day),
  currentPeriodStartedAt: new Date(now.getTime() - 5 * day),
  currentPeriodEndsAt: new Date(now.getTime() + 25 * day),
  trialStartedAt: null,
  trialEndsAt: null,
  cancelAtPeriodEnd: false,
  cancelledAt: null,
  provider: null,
  providerCustomerId: null,
  providerSubscriptionId: null,
};

const checks = [];
function check(name, fn) {
  fn();
  checks.push(name);
}

check("catalog: 14-day trial and KES 1500 monthly Starter", () => {
  assert.equal(TRIAL_DURATION_DAYS, 14);
  assert.equal(STARTER_MONTHLY_PRICE, 1500);
  assert.equal(BILLING_CURRENCY, "KES");
  assert.equal(BILLING_INTERVAL, "monthly");
  assert.deepEqual(Object.keys(PLAN_CATALOG).sort(), ["starter", "trial"]);
});

check("missing subscription record is grandfathered with full access", () => {
  const e = evaluateEntitlement(null, now);
  assert.equal(e.status, "grandfathered");
  assert.equal(e.canAccessProduct, true);
  assert.equal(e.grandfathered, true);
  assert.equal(authorizeAccess(e, "inquiries").allowed, true);
});

check("trialing subscription has Starter entitlements", () => {
  const e = evaluateEntitlement(
    {
      ...base,
      plan: "trial",
      status: "trialing",
      trialStartedAt: new Date(now.getTime() - 2 * day),
      trialEndsAt: new Date(now.getTime() + 12 * day),
    },
    now
  );
  assert.equal(e.status, "trialing");
  assert.equal(e.canAccessProduct, true);
  assert.equal(e.daysRemaining, 12);
  assert.equal(canUseFeature(e, "reports"), true);
});

check("expired trial loses paid access and cannot bypass the gate", () => {
  const e = evaluateEntitlement(
    {
      ...base,
      plan: "trial",
      status: "trialing",
      trialStartedAt: new Date(now.getTime() - 20 * day),
      trialEndsAt: new Date(now.getTime() - 6 * day),
    },
    now
  );
  assert.equal(e.status, "expired");
  assert.equal(e.canAccessProduct, false);
  assert.equal(authorizeAccess(e, "inquiries").allowed, false);
  assert.equal(canUseFeature(e, "followUps"), false);
});

check("active Starter keeps access before period end", () => {
  const e = evaluateEntitlement({ ...base, plan: "starter", status: "active" }, now);
  assert.equal(e.status, "active");
  assert.equal(e.canAccessProduct, true);
  assert.equal(authorizeAccess(e, "inquiries").allowed, true);
});

check("active Starter expires after period end", () => {
  const e = evaluateEntitlement(
    { ...base, plan: "starter", status: "active", currentPeriodEndsAt: new Date(now.getTime() - day) },
    now
  );
  assert.equal(e.status, "expired");
  assert.equal(e.canAccessProduct, false);
});

check("cancellation at period end preserves access until effective end", () => {
  const e = evaluateEntitlement(
    {
      ...base,
      plan: "starter",
      status: "cancelled",
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(now.getTime() - day),
    },
    now
  );
  assert.equal(e.status, "cancelled");
  assert.equal(e.canAccessProduct, true);
  assert.equal(authorizeAccess(e, "inquiries").allowed, true);
});

check("cancellation loses access once period ends", () => {
  const e = evaluateEntitlement(
    {
      ...base,
      plan: "starter",
      status: "cancelled",
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(now.getTime() - 30 * day),
      currentPeriodEndsAt: new Date(now.getTime() - day),
    },
    now
  );
  assert.equal(e.canAccessProduct, false);
});

check("past_due keeps access until period end then expires", () => {
  const within = evaluateEntitlement({ ...base, plan: "starter", status: "past_due" }, now);
  const after = evaluateEntitlement(
    { ...base, plan: "starter", status: "past_due", currentPeriodEndsAt: new Date(now.getTime() - day) },
    now
  );
  assert.equal(within.canAccessProduct, true);
  assert.equal(after.status, "expired");
  assert.equal(after.canAccessProduct, false);
});

check("expired subscription status has no paid features", () => {
  const e = evaluateEntitlement({ ...base, plan: "starter", status: "expired" }, now);
  assert.equal(e.canAccessProduct, false);
  assert.deepEqual(e.features, []);
});

check("repeated entitlement evaluation is stable (idempotent decision)", () => {
  const record = {
    ...base,
    plan: "trial",
    status: "trialing",
    trialStartedAt: new Date(now.getTime() - day),
    trialEndsAt: new Date(now.getTime() + 13 * day),
  };
  const first = evaluateEntitlement(record, now);
  const second = evaluateEntitlement(record, now);
  assert.deepEqual(first, second);
});

rmSync(OUT, { recursive: true, force: true });
console.log(`subscription unit tests passed: ${checks.length}`);
for (const name of checks) console.log(`  - ${name}`);
