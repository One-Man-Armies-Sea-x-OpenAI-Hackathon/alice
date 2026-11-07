import { request, chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.WEB_BASE_URL || "http://127.0.0.1:3001";
const api = await request.newContext({ baseURL: base });
const password = crypto.randomUUID() + "QA!";
assert.ok(
  (
    await api.post("/api/auth/register", {
      data: {
        email: `settings-${Date.now()}@alice.local`,
        name: "Settings QA",
        password,
      },
    })
  ).ok(),
);
const browser = await chromium.launch();
const ctx = await browser.newContext({
  storageState: await api.storageState(),
  viewport: { width: 1440, height: 1100 },
});
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(base);
await p.getByRole("heading", { name: "What are we testing today?" }).waitFor();
await p
  .getByRole("button", { name: "Multiple directions", exact: true })
  .waitFor();
await p.getByRole("button", { name: /^⚙ Tools/ }).click();
await p.getByRole("dialog", { name: "Campaign tools" }).waitFor();
await p.getByRole("heading", { name: "What are we testing today?" }).click();
assert.equal(
  await p.getByRole("dialog", { name: "Campaign tools" }).count(),
  0,
);
await p.getByRole("button", { name: /^⚙ Tools/ }).click();
await p.keyboard.press("Escape");
assert.equal(
  await p.getByRole("dialog", { name: "Campaign tools" }).count(),
  0,
);
await p
  .locator(".variant-card input[type=file]")
  .first()
  .setInputFiles({
    name: "reference.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkL8AAAAASUVORK5CYII=",
      "base64",
    ),
  });
await p
  .getByRole("button", { name: "Confirm and read reference", exact: true })
  .click();
await p.getByLabel("Variant A visual idea").filter({ visible: true }).waitFor();
await p.waitForFunction(() =>
  document.querySelector("#visual-A").value.includes("Mock visual reference"),
);
await p.getByRole("button", { name: "Account settings", exact: true }).click();
const settings = p.getByRole("dialog", { name: "Settings", exact: true });
await settings.waitFor();
await settings.getByLabel("Display name").fill("Settings saved");
await settings.getByLabel("Appearance").selectOption("light");
await settings.getByRole("button", { name: "Save preferences" }).click();
await p.getByText(/Saved. Simulation defaults/).waitFor();
await settings.getByRole("button", { name: "Simulation", exact: true }).click();
await settings.getByLabel("Direction mode").selectOption("single");
await settings.getByRole("button", { name: "Save preferences" }).click();
await p.getByText(/Saved. Simulation defaults/).waitFor();
await settings
  .getByRole("button", { name: "Integrations", exact: true })
  .click();
await p.getByText("OpenAI model provider", { exact: true }).waitFor();
await p.screenshot({ path: "/private/tmp/alice-harness-settings.png" });
await settings.getByRole("button", { name: "Close settings" }).click();
await p.getByRole("button", { name: /New chat/ }).click();
assert.equal(await p.locator(".variant-card").count(), 1);
await p.setViewportSize({ width: 390, height: 844 });
await p.getByRole("button", { name: "Collapse sidebar" }).click();
await p.screenshot({ path: "/private/tmp/alice-creative-mobile.png" });
assert.equal(
  await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
assert.deepEqual(errors, []);
await browser.close();
await api.delete("/api/auth/account", { data: { password } });
await api.dispose();
console.log({
  multiple_campaigns: true,
  outside_click_and_escape: true,
  visual_reference: true,
  saved_preferences: true,
  mobile: true,
  errors,
});
