import { request, chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.WEB_BASE_URL || "http://127.0.0.1:3001";
assert.ok(
  (await (await fetch(base + "/api/health")).json()).mock,
  "Requires mock models",
);
const api = await request.newContext({ baseURL: base });
const password = crypto.randomUUID() + "QA!";
const created = await api.post("/api/auth/register", {
  data: {
    email: `background-${Date.now()}@alice.local`,
    name: "Background QA",
    password,
  },
});
assert.ok(created.ok(), await created.text());
const { campaign: fixture } = JSON.parse(
  await readFile("recordings/langkah-run.json", "utf8"),
);
const campaign = (brand) => ({
  ...fixture,
  id: crypto.randomUUID(),
  brand,
  location: "Nationwide online",
  timing: "None",
  channels: ["instagram"],
  variants: [fixture.variants[0]],
  tools: { risk: false, rewrite: false, calendar: true },
});
const first = campaign("First background campaign"),
  second = campaign("Second background campaign");
await api.put("/api/conversations", {
  data: {
    chats: [first, second].map((c) => ({
      id: c.id,
      title: c.brand,
      campaign: c,
      status: "idle",
      messages: [],
    })),
  },
});
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: await api.storageState(),
  viewport: { width: 1600, height: 1000 },
});
const p = await context.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
let uploads = 0;
p.on("request", (r) => {
  if (r.url().endsWith("/api/reference") && r.method() === "POST") uploads++;
});
try {
  await p.goto(base);
  await p.getByRole("button", { name: first.brand, exact: true }).click();
  await p
    .getByRole("textbox", { name: "Campaign brief", exact: true })
    .fill("Launch this campaign to office workers in Jakarta.");
  await p.getByRole("button", { name: "Send campaign", exact: true }).click();
  await p.getByRole("button", { name: /New chat/ }).click();
  assert.equal(
    await p
      .getByRole("textbox", { name: "Campaign brief", exact: true })
      .inputValue(),
    "",
  );
  await p.getByRole("button", { name: second.brand, exact: true }).click();
  await p
    .getByRole("textbox", { name: "Campaign brief", exact: true })
    .fill("Run this second campaign independently.");
  await p.getByRole("button", { name: "Send campaign", exact: true }).click();
  await p.getByRole("button", { name: /New chat/ }).click();
  let chats = [];
  for (let i = 0; i < 120; i++) {
    chats = (await (await api.get("/api/conversations")).json()).chats;
    if (
      [first.id, second.id].every(
        (id) => chats.find((x) => x.id === id)?.status === "done",
      )
    )
      break;
    await p.waitForTimeout(500);
  }
  for (const c of [first, second])
    assert.equal(
      chats.find((x) => x.id === c.id)?.status,
      "done",
      JSON.stringify(
        chats.map((c) => ({
          title: c.title,
          status: c.status,
          error: c.error,
        })),
      ),
    );
  assert.notEqual(
    chats.find((c) => c.id === first.id).runId,
    chats.find((c) => c.id === second.id).runId,
  );
  await p.getByRole("button", { name: first.brand, exact: true }).click();
  await p.getByRole("heading", { name: first.brand, exact: true }).waitFor();
  await p.getByRole("button", { name: second.brand, exact: true }).click();
  await p.getByRole("heading", { name: second.brand, exact: true }).waitFor();
  await p.getByRole("button", { name: /New chat/ }).click();
  const thread = await p.locator(".conversation-thread").boundingBox(),
    composer = await p.locator(".composer").boundingBox(),
    form = await p
      .getByRole("complementary", { name: "Campaign directions" })
      .boundingBox();
  assert.ok(form.x > composer.x + composer.width - 1);
  assert.ok(composer.y > thread.y);
  // Selecting a file never sends it before confirmation; reading has real upload and indeterminate model progress.
  await p
    .locator(".variant-card input[type=file]")
    .first()
    .setInputFiles({
      name: "preview.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkL8AAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await p
    .getByRole("img", { name: "Selected visual reference preview" })
    .waitFor();
  assert.equal(uploads, 0);
  let release;
  const gate = new Promise((r) => (release = r));
  let held = false;
  await p.route("**/api/tasks/*", async (route) => {
    if (!held) {
      held = true;
      await gate;
    }
    await route.continue();
  });
  await p
    .getByRole("button", { name: "Confirm and read reference", exact: true })
    .click();
  await p
    .getByRole("progressbar", { name: "Reading visual reference" })
    .waitFor();
  assert.equal(uploads, 1);
  release();
  await p.waitForFunction(() =>
    document.querySelector("#visual-A").value.includes("Mock visual reference"),
  );
  await p.unroute("**/api/tasks/*");
  await p.screenshot({ path: "/private/tmp/alice-background-directions.png" });
  // The exact empty-response regression is rendered as a useful error, with the prompt safely in chat.
  await p.route("**/api/clarify", (route) =>
    route.fulfill({ status: 502, body: "" }),
  );
  const text =
    "Preserve this brief when the gateway returns an empty response.";
  await p
    .getByRole("textbox", { name: "Campaign brief", exact: true })
    .fill(text);
  await p.getByRole("button", { name: "Send campaign", exact: true }).click();
  await p
    .getByRole("alert")
    .filter({ hasText: "empty response (HTTP 502)" })
    .waitFor();
  assert.equal(
    await p.locator(".user-message").filter({ hasText: text }).count(),
    1,
  );
  assert.equal(
    await p
      .getByRole("textbox", { name: "Campaign brief", exact: true })
      .inputValue(),
    "",
  );
  await p.route("**/api/reference", (route) =>
    route.fulfill({ status: 502, body: "" }),
  );
  await p
    .locator(".variant-card input[type=file]")
    .first()
    .setInputFiles({
      name: "empty-gateway.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkL8AAAAASUVORK5CYII=",
        "base64",
      ),
    });
  await p
    .getByRole("button", { name: "Confirm and read reference", exact: true })
    .click();
  await p
    .locator(".reference-error")
    .filter({ hasText: "empty response (HTTP 502)" })
    .waitFor();
  await p.waitForTimeout(500);
  const resumed = campaign("Restored background campaign");
  const taskResponse = await api.post("/api/clarify", {
    headers: { Prefer: "respond-async" },
    data: { campaign: resumed, answers: {} },
  });
  assert.equal(taskResponse.status(), 202);
  const task = await taskResponse.json();
  const existing = (await (await api.get("/api/conversations")).json()).chats;
  await api.put("/api/conversations", {
    data: {
      chats: [
        ...existing,
        {
          id: resumed.id,
          title: resumed.brand,
          campaign: resumed,
          status: "preparing",
          messages: [],
          taskId: task.task_id,
        },
      ],
    },
  });
  await p.reload();
  let restored;
  for (let i = 0; i < 120; i++) {
    restored = (await (await api.get("/api/conversations")).json()).chats.find(
      (c) => c.id === resumed.id,
    );
    if (restored?.status === "done") break;
    await p.waitForTimeout(500);
  }
  assert.equal(
    restored?.status,
    "done",
    "Intake job should resume after reloading the workspace",
  );
  assert.deepEqual(errors, []);
  console.log({
    two_independent_runs: true,
    navigation_while_processing: true,
    correct_results_on_return: true,
    right_panel: true,
    confirmed_upload: true,
    reading_progress: true,
    empty_response_recovery: true,
    errors,
  });
} finally {
  await browser.close();
  await api.delete("/api/auth/account", { data: { password } });
  await api.dispose();
}
