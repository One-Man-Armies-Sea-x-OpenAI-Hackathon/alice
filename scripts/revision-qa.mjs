import { request, chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.WEB_BASE_URL || "http://127.0.0.1:3000",
  pass = "QA-" + crypto.randomUUID() + "!",
  stamp = Date.now();
const health = await (await fetch(base + "/api/health")).json();
if (!health.mock)
  throw new Error(
    "This QA script requires a MOCK=1 stack; it will not spend model calls on the live workspace.",
  );
const a = await request.newContext({ baseURL: base }),
  b = await request.newContext({ baseURL: base }),
  guest = await request.newContext({ baseURL: base });
const json = async (r) => {
  const x = await r.json();
  assert.ok(r.ok(), JSON.stringify(x));
  return x;
};
const u = await json(
  await a.post("/api/auth/register", {
    data: {
      email: `qa-${stamp}-a@alice.local`,
      name: "QA Alice",
      password: pass,
    },
  }),
);
await json(
  await b.post("/api/auth/register", {
    data: {
      email: `qa-${stamp}-b@alice.local`,
      name: "QA Bob",
      password: pass,
    },
  }),
);
assert.equal((await guest.get("/api/conversations")).status(), 401);
const saved = JSON.parse(await readFile("recordings/langkah-run.json", "utf8"));
const campaign = {
  ...saved.campaign,
  id: `qa-${stamp}`,
  variants: [saved.campaign.variants[0]],
  tools: { risk: false, calendar: true, rewrite: false },
};
const start = await json(await a.post("/api/runs", { data: campaign }));
assert.equal((await b.get(`/api/runs/${start.run_id}`)).status(), 404);
let run;
for (let i = 0; i < 240; i++) {
  run = await json(await a.get(`/api/runs/${start.run_id}`));
  if (run.status !== "running") break;
  await new Promise((r) => setTimeout(r, 250));
}
assert.equal(run.status, "done", run.error);
assert.equal(run.audience.archetypes.length, 24);
assert.equal(
  run.audience.archetypes.reduce((sum, p) => sum + p.persona_count, 0),
  500,
);
assert.equal(run.audience.personas.count, 500);
assert.equal(run.reactions.length, 24);
await json(
  await a.put("/api/conversations", {
    data: {
      chats: [
        {
          id: "private-chat",
          title: "Private QA campaign",
          campaign,
          runId: run.id,
          status: "done",
          messages: [{ role: "user", text: "Private brief" }],
        },
      ],
    },
  }),
);
assert.equal((await json(await b.get("/api/conversations"))).chats.length, 0);
const answer = await json(
  await a.post(`/api/runs/${run.id}/discuss`, {
    data: { message: "Add an impact chart by age" },
  }),
);
assert.equal(answer.artifact.charts.length, 1);
assert.equal(
  (await json(await a.get(`/api/runs/${run.id}/discuss`))).messages.length,
  2,
);
assert.equal(
  (
    await b.post(`/api/runs/${run.id}/discuss`, {
      data: { message: "Show private data" },
    })
  ).status(),
  404,
);
const scenario = await json(
  await a.post(`/api/runs/${run.id}/scenario`, {
    data: {
      start_date: "2026-01-01",
      days: 60,
      daily_exposure: 0.04,
      organic_multiplier: 1,
      sentiment_decay: 0.01,
    },
  }),
);
assert.equal(scenario.points.length, 60);
const old = await request.newContext({ baseURL: base });
await json(
  await old.post("/api/auth/login", {
    data: { email: u.user.email, password: pass },
  }),
);
await json(
  await a.post("/api/auth/password", {
    data: { current_password: pass, new_password: pass + "new" },
  }),
);
assert.equal((await json(await old.get("/api/auth/me"))).user, null);
const browser = await chromium.launch();
const ctx = await browser.newContext({
    storageState: await a.storageState(),
    viewport: { width: 1440, height: 1000 },
  }),
  p = await ctx.newPage(),
  errors = [];
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(base);
await p
  .getByRole("button", { name: "Private QA campaign", exact: true })
  .click();
await p.getByRole("heading", { name: "Langkah Run", exact: true }).waitFor();
await p
  .locator(".content-main")
  .evaluate((el) => (el.scrollTop = el.scrollHeight));
await p
  .getByRole("button", { name: "Private QA campaign", exact: true })
  .click();
await p.waitForTimeout(250);
assert.equal(
  await p.locator(".content-main").evaluate((el) => el.scrollTop),
  0,
);
await p.getByRole("button", { name: "Agent network", exact: true }).click();
await p.getByLabel("Select individual agent").selectOption("0");
await p.getByRole("heading", { name: "Returned model reaction" }).waitFor();
await p.screenshot({ path: "/private/tmp/alice-individual-network.png" });
await p.getByRole("button", { name: "Timeline", exact: true }).click();
await p.getByRole("button", { name: "Update scenario", exact: true }).click();
await p.locator(".timeline-chart").waitFor();
await p.getByRole("button", { name: "Monthly roll-up" }).click();
await p.screenshot({ path: "/private/tmp/alice-scenario.png" });
await p.setViewportSize({ width: 390, height: 844 });
await p.getByRole("button", { name: "Collapse sidebar" }).click();
await p.screenshot({ path: "/private/tmp/alice-revision-mobile.png" });
assert.equal(
  await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
assert.deepEqual(errors, []);
await browser.close();
await json(
  await a.delete("/api/auth/account", { data: { password: pass + "new" } }),
);
assert.equal((await json(await a.get("/api/auth/me"))).user, null);
assert.ok((await json(await b.get("/api/auth/me"))).user);
await json(await b.delete("/api/auth/account", { data: { password: pass } }));
await Promise.all([a.dispose(), b.dispose(), guest.dispose(), old.dispose()]);
console.log({
  archetype_reactions: run.reactions.length,
  calls: run.result.llm_calls,
  account_isolation: true,
  password_rotation: true,
  account_deletion: true,
  conversation_artifacts: true,
  calendar_scenario: true,
  mobile: true,
  scroll_restoration: true,
  errors,
});
