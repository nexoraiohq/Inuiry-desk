import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
const BASE = "http://localhost:3000";
mkdirSync("_finalcheck", { recursive: true });
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await p.goto(`${BASE}/register`, { waitUntil: "domcontentloaded" });
  await p.getByPlaceholder("Alex Morgan").fill("Final Check");
  await p.getByPlaceholder("Morgan Agency").fill("Check Studio");
  await p.getByPlaceholder("you@company.com").first().fill("final-check@example.test");
  await p.getByPlaceholder("At least 8 characters").fill("CheckPass123!");
  await p.getByPlaceholder("Repeat your password").fill("CheckPass123!");
  await p.getByRole("button", { name: "Create account" }).click();
  await p.waitForURL("**/dashboard", { timeout: 30000 });
  await p.getByText("Priority queue").waitFor({ timeout: 20000 });
  await p.waitForTimeout(700);
  await p.screenshot({ path: "_finalcheck/dashboard.png", fullPage: true });
  await p.getByRole("button", { name: "Add Inquiry" }).first().click();
  await p.waitForTimeout(500);
  const box = await p.locator('[role="dialog"]').boundingBox();
  console.log(`dialog_y=${box?.y} dialog_h=${box?.height}`);
  await p.screenshot({ path: "_finalcheck/dialog.png" });
  console.log("finalcheck_done=true");
} finally { await b.close(); }
