import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:3000");
await page
  .getByRole("heading", { name: "What are we testing today?" })
  .waitFor();
assert.ok(await page.locator('img[src="/alice-logo.png"]').count());
await page.locator(".demo-card").first().click();
await page.getByRole("button", { name: "Send campaign", exact: true }).click();
await page
  .getByRole("heading", { name: "Simulating Langkah Run" })
  .waitFor({ timeout: 60000 });
await page.waitForTimeout(4000);
await page.screenshot({ path: "/private/tmp/alice-run.png" });
await page
  .getByRole("heading", { name: "Langkah Run", exact: true })
  .waitFor({ timeout: 90000 });
assert.ok(await page.getByText("Too close to call", { exact: true }).count());
await page.reload();
await page.getByRole("button", { name: /Langkah Run.*Demo/ }).click();
await page.getByRole("heading", { name: "Langkah Run", exact: true }).waitFor();
await context.setOffline(true);
await page.getByRole("button", { name: "↺ Replay", exact: true }).click();
await page.waitForTimeout(500);
await page
  .getByRole("button", { name: "Skip to dashboard" })
  .click()
  .catch(() => {});
await page.getByRole("heading", { name: "Langkah Run", exact: true }).waitFor();
await context.setOffline(false);
console.log({
  logo: true,
  fullComposerToDashboard: true,
  offlineReplay: true,
  errors,
});
assert.deepEqual(errors, []);
await browser.close();
