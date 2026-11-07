import { chromium, request } from "@playwright/test";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.WEB_BASE_URL || "http://127.0.0.1:3001",
  api = await request.newContext({ baseURL: base }),
  password = crypto.randomUUID() + "QA!";
const r = await api.post("/api/auth/register", {
  data: {
    name: "Frontend QA",
    email: `frontend-${Date.now()}@alice.local`,
    password,
  },
});
assert.ok(r.ok(), await r.text());
const fixture = JSON.parse(
  await readFile("recordings/langkah-run.json", "utf8"),
);
await api.put("/api/conversations", {
  data: {
    chats: ["idle", "waiting", "running", "done", "failed"].map(
      (status, i) => ({
        id: `status-${i}`,
        title: `Campaign ${status}`,
        campaign: fixture.campaign,
        status,
        messages: [],
      }),
    ),
  },
});
const browser = await chromium.launch(),
  ctx = await browser.newContext({ storageState: await api.storageState() }),
  page = await ctx.newPage();
await page.goto(base);
await page.locator(".chat-status-dot").first().waitFor();
for (const theme of ["dark", "light"]) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
  const dims = await page.locator(".chat-status-dot").evaluateAll((es) =>
    es.map((e) => ({
      w: e.getBoundingClientRect().width,
      h: e.getBoundingClientRect().height,
      p: getComputedStyle(e).padding,
    })),
  );
  assert.ok(dims.every((d) => d.w === 6 && d.h === 6 && d.p === "0px"));
}
const text = "Brand: Prompt test. Coffee for office workers.";
const input = page.getByRole("textbox", {
  name: "Campaign brief",
  exact: true,
});
await input.fill(text);
await page.getByRole("button", { name: "Send campaign", exact: true }).click();
await page.waitForTimeout(150);
assert.equal(await input.inputValue(), "");
assert.equal(
  await page.locator(".user-message").filter({ hasText: text }).count(),
  1,
);
await browser.close();
await api.delete("/api/auth/account", { data: { password } });
await api.dispose();
console.log(
  "Both themes keep circular status dots; submitted prompt appears once and the input clears.",
);
