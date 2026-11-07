import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:3000");
await page
  .getByRole("heading", { name: "What are we testing today?" })
  .waitFor();
await page.screenshot({ path: "/private/tmp/alice-home.png", fullPage: true });
await page.getByRole("button", { name: /Langkah Run.*Demo/ }).click();
await page.getByRole("heading", { name: "Langkah Run", exact: true }).waitFor();
for (const tab of [
  "Reaction map",
  "A/B ranking",
  "Risk flags",
  "Fixes",
  "Agent feed",
  "Overview",
]) {
  await page.getByRole("button", { name: new RegExp("^" + tab) }).click();
  await page.waitForTimeout(120);
}
await page.screenshot({
  path: "/private/tmp/alice-dashboard.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Toggle color theme" }).click();
await page.screenshot({ path: "/private/tmp/alice-light.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole("button", { name: "Collapse sidebar" }).click();
await page.screenshot({
  path: "/private/tmp/alice-mobile.png",
  fullPage: true,
});
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > innerWidth,
);
console.log({ errors, mobileOverflow: overflow });
if (errors.length || overflow) process.exitCode = 1;
await browser.close();
