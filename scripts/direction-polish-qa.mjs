import { request, chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.WEB_BASE_URL || "http://127.0.0.1:3001";
assert.ok(
  (await (await fetch(base + "/api/health")).json()).mock,
  "Requires MOCK=1",
);
const api = await request.newContext({ baseURL: base }),
  password = crypto.randomUUID() + "QA!";
assert.ok(
  (
    await api.post("/api/auth/register", {
      data: {
        email: `polish-${Date.now()}@alice.local`,
        name: "Polish QA",
        password,
      },
    })
  ).ok(),
);
const { campaign: fixture } = JSON.parse(
  await readFile("recordings/langkah-run.json", "utf8"),
);
await api.put("/api/conversations", {
  data: {
    chats: [
      {
        id: "delete-qa",
        title: "Delete confirmation QA",
        campaign: fixture,
        status: "idle",
        messages: [],
      },
    ],
  },
});
const browser = await chromium.launch(),
  context = await browser.newContext({
    storageState: await api.storageState(),
    viewport: { width: 1600, height: 1000 },
  }),
  p = await context.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
try {
  await p.goto(base);
  await p
    .getByRole("heading", { name: "What are we testing today?" })
    .waitFor();
  assert.equal(await p.getByText("Campaign lab", { exact: true }).count(), 0);
  await p
    .getByRole("button", { name: "Delete confirmation QA", exact: true })
    .hover();
  await p
    .getByRole("button", { name: "Delete Delete confirmation QA", exact: true })
    .click();
  await p.getByRole("alertdialog").waitFor();
  assert.equal(
    (await (await api.get("/api/conversations")).json()).chats.length,
    1,
  );
  await p
    .getByRole("button", { name: "Keep conversation", exact: true })
    .click();
  assert.equal(await p.getByRole("alertdialog").count(), 0);
  await p
    .getByRole("button", { name: "Delete confirmation QA", exact: true })
    .hover();
  await p
    .getByRole("button", { name: "Delete Delete confirmation QA", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Delete conversation", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Delete confirmation QA", exact: true })
    .waitFor({ state: "detached" });
  await p.getByRole("button", { name: "Collapse sidebar" }).click();
  await p.waitForTimeout(100);
  const halfway = await p
    .locator(".sidebar")
    .evaluate((e) => e.getBoundingClientRect().width);
  assert.ok(halfway > 0 && halfway < 248, `Animated sidebar width: ${halfway}`);
  await p.waitForTimeout(350);
  assert.equal(
    await p
      .locator(".sidebar")
      .evaluate((e) => e.getBoundingClientRect().width),
    0,
  );
  await p.getByRole("button", { name: "Open sidebar" }).click();
  await p.waitForTimeout(400);
  assert.equal(
    await p
      .locator(".sidebar")
      .evaluate((e) => e.getBoundingClientRect().width),
    248,
  );
  const input = p.getByRole("textbox", { name: "Campaign brief", exact: true });
  const original = (await input.boundingBox()).height;
  await input.fill(
    Array.from(
      { length: 40 },
      (_, i) => `Line ${i}: Campaign context and audience details.`,
    ).join("\n"),
  );
  const tall = (await input.boundingBox()).height;
  assert.ok(tall > original && tall <= 241);
  assert.equal(
    await input.evaluate((e) => getComputedStyle(e).overflowY),
    "auto",
  );
  await input.fill("A concise campaign brief.");
  assert.ok((await input.boundingBox()).height < tall);
  assert.equal(await p.locator(".variant-card").count(), 2);
  for (let i = 0; i < 25; i++)
    await p.getByRole("button", { name: "Add direction", exact: true }).click();
  assert.equal(await p.locator(".variant-card").count(), 27);
  assert.equal(
    await p.getByLabel("Variant AA label", { exact: true }).inputValue(),
    "Direction AA",
  );
  await p.locator(".budget-note").waitFor();
  await p.getByRole("button", { name: "Send campaign", exact: true }).click();
  await p
    .getByRole("alert")
    .filter({ hasText: "exceeds the simulation call budget" })
    .waitFor();
  await p.getByRole("button", { name: /New chat/ }).click();
  assert.equal(await p.locator(".variant-card").count(), 2);
  await p
    .getByRole("button", { name: "Remove variant A", exact: true })
    .click();
  await p
    .getByRole("button", { name: "Multiple directions", exact: true })
    .click();
  const ids = await p.locator(".variant-card > div > b").allTextContents();
  assert.equal(new Set(ids).size, 2);
  let release;
  const held = new Promise((r) => (release = r));
  await p.route("**/api/clarify", async (route) => {
    await held;
    const { campaign } = route.request().postDataJSON();
    await route.fulfill({
      json: {
        campaign,
        ready: false,
        questions: [
          {
            id: "context",
            text: "Which audience should we prioritize?",
            options: ["Urban professionals"],
            allows_free_text: true,
          },
        ],
      },
    });
  });
  await input.fill("Brand: Loading test. Prepare this campaign.");
  await p.getByRole("button", { name: "Send campaign", exact: true }).click();
  await p.locator(".loading-dots").waitFor();
  const motion = await p.locator(".loading-dots i").evaluateAll((es) =>
    es.map((e) => ({
      name: getComputedStyle(e).animationName,
      delay: getComputedStyle(e).animationDelay,
    })),
  );
  assert.ok(motion.every((m) => m.name === "loading-dot-bounce"));
  assert.equal(new Set(motion.map((m) => m.delay)).size, 3);
  await p.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await p
      .locator(".loading-dots i")
      .first()
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  await p.emulateMedia({ reducedMotion: "no-preference" });
  release();
  await p
    .getByRole("heading", { name: "Which audience should we prioritize?" })
    .waitFor();
  await p.unroute("**/api/clarify");
  // The actual orchestration and Rust engine compare IDs outside A/B/C.
  const campaign = {
    ...fixture,
    id: crypto.randomUUID(),
    brand: "Five-direction QA",
    channels: ["instagram"],
    location: "Nationwide online",
    timing: "None",
    tools: { risk: false, rewrite: false, calendar: true },
    variants: ["A", "B", "C", "D", "AA"].map((id) => ({
      ...fixture.variants[0],
      id,
      label: `Direction ${id}`,
    })),
  };
  const started = await api.post("/api/runs", { data: campaign });
  assert.ok(started.ok(), await started.text());
  const { run_id } = await started.json();
  let run;
  for (let i = 0; i < 180; i++) {
    run = await (await api.get(`/api/runs/${run_id}`)).json();
    if (run.status !== "running") break;
    await p.waitForTimeout(500);
  }
  assert.equal(run.status, "done", run.error);
  assert.equal(run.result.per_variant.length, 5);
  assert.equal(run.reactions.length, 2500);
  const chartResponse = await api.post(`/api/runs/${run_id}/discuss`, {
    data: { message: "Add an impact chart for direction AA by age" },
  });
  assert.ok(chartResponse.ok(), await chartResponse.text());
  assert.equal(
    (await chartResponse.json()).artifact.charts[0].variant_id,
    "AA",
  );
  const saved = (await (await api.get("/api/conversations")).json()).chats;
  await api.put("/api/conversations", {
    data: {
      chats: [
        ...saved,
        {
          id: "five-direction",
          title: campaign.brand,
          campaign,
          status: "done",
          runId: run_id,
          messages: [],
        },
      ],
    },
  });
  await p.reload();
  await p.getByRole("button", { name: campaign.brand, exact: true }).click();
  await p.getByRole("heading", { name: campaign.brand, exact: true }).waitFor();
  await p.getByRole("button", { name: "Reaction map", exact: true }).click();
  await p
    .getByRole("button", { name: "AA · Direction AA", exact: true })
    .click();
  await p.screenshot({
    path: "/private/tmp/alice-five-direction-dashboard.png",
  });
  await p.getByRole("button", { name: /New chat/ }).click();
  await p.setViewportSize({ width: 390, height: 844 });
  await p.getByRole("button", { name: "Collapse sidebar" }).click();
  await p.waitForTimeout(400);
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p.getByRole("button", { name: "Directions", exact: true }).click();
  await p
    .getByLabel("Variant A headline", { exact: true })
    .fill(
      Array.from({ length: 30 }, () => "Long campaign headline").join("\n"),
    );
  assert.ok(
    (await p.getByLabel("Variant A headline", { exact: true }).boundingBox())
      .height <= 241,
  );
  await p.screenshot({ path: "/private/tmp/alice-polished-mobile.png" });
  assert.deepEqual(errors, []);
  console.log({
    sidebar_motion: true,
    auto_growing_editors: true,
    delete_confirmation: true,
    animated_loading_dots: true,
    reduced_motion: true,
    no_breadcrumb: true,
    planned_directions: 27,
    simulated_directions: 5,
    reactions: run.reactions.length,
    budget_guard: true,
    mobile: true,
    errors,
  });
} finally {
  await browser.close();
  await api.delete("/api/auth/account", { data: { password } });
  await api.dispose();
}
