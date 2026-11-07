import { request, chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const base = process.env.WEB_BASE_URL || "http://127.0.0.1:3001";
assert.ok(
  (await (await fetch(base + "/api/health")).json()).mock,
  "Use MOCK mode",
);
const api = await request.newContext({ baseURL: base });
const other = await request.newContext({ baseURL: base });
const password = crypto.randomUUID() + "Qa!";
const browser = await chromium.launch();
async function json(r) {
  assert.ok(r.ok(), await r.text());
  return r.json();
}
async function clarify(client, data) {
  const task = await json(
    await client.post("/api/clarify", {
      headers: { Prefer: "respond-async" },
      data,
    }),
  );
  for (let i = 0; i < 120; i++) {
    const state = await json(await client.get("/api/tasks/" + task.task_id));
    if (state.state === "failed") throw new Error(state.error);
    if (state.state === "done") return state.result;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Intake timed out");
}
try {
  for (const [client, suffix] of [
    [api, "a"],
    [other, "b"],
  ])
    await json(
      await client.post("/api/auth/register", {
        data: {
          name: "Research QA",
          email: `research-qa-${Date.now()}-${suffix}@alice.local`,
          password,
        },
      }),
    );
  const fixture = JSON.parse(
    await readFile("recordings/langkah-run.json", "utf8"),
  ).campaign;
  const campaign = {
    ...fixture,
    id: crypto.randomUUID(),
    brand: "Research QA campaign",
    notes:
      "An Indonesia marketplace campaign. Explore public context before planning.",
    channels: [],
    location: "",
    timing: "",
    variants: [fixture.variants[0]],
    tools: { risk: false, rewrite: false, calendar: true },
  };
  const initial = await clarify(api, { campaign, research: true });
  assert.equal(initial.research.status, "mock");
  assert.equal(initial.research.model_calls, 0);
  assert.equal(initial.research.search_calls, 0);
  assert.equal(initial.research.sources.length, 0);
  const rejected = await clarify(other, {
    campaign,
    research: false,
    research_id: initial.research.id,
  });
  assert.equal(
    rejected.research,
    undefined,
    "Private research cannot be reused by another account",
  );
  const complete = await clarify(api, {
    campaign: initial.campaign,
    answers: {
      channel: "Instagram",
      location: "Nationwide online",
      timing: "None",
    },
    research: true,
    research_id: initial.research.id,
  });
  assert.equal(
    complete.research.id,
    initial.research.id,
    "Follow-up reuses research snapshot",
  );
  assert.equal(complete.ready, true);
  const started = await json(
    await api.post("/api/runs", {
      data: { ...complete.campaign, research_id: initial.research.id },
    }),
  );
  let run;
  for (let i = 0; i < 120; i++) {
    const status = await json(
      await api.get(`/api/runs/${started.run_id}?summary=1`),
    );
    if (status.status !== "running") {
      run = await json(await api.get(`/api/runs/${started.run_id}`));
      break;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(run.status, "done", run.error);
  assert.equal(run.research.id, initial.research.id);
  const pref = {
    name: "Research QA",
    theme: "dark",
    depth: "quick",
    mode: "multiple",
    tools: { risk: true, calendar: true, rewrite: true },
    external_research: false,
  };
  await json(await api.put("/api/auth/preferences", { data: pref }));
  const disabled = await clarify(api, { campaign });
  assert.equal(
    disabled.research,
    undefined,
    "Saved default is honored by the API",
  );
  const context = await browser.newContext({
    storageState: await api.storageState(),
    viewport: { width: 1440, height: 1000 },
  });
  const p = await context.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base);
  await p.getByRole("button", { name: /Tools/ }).click();
  const checkbox = p.getByRole("checkbox", { name: /External research/ });
  assert.equal(await checkbox.isChecked(), false);
  await checkbox.check();
  await p.getByRole("button", { name: /Tools/ }).click();
  await p
    .getByRole("textbox", { name: "Campaign brief", exact: true })
    .fill("A marketplace campaign in Indonesia");
  await p.getByRole("button", { name: "Send campaign", exact: true }).click();
  await p.getByText("Mock · no live search", { exact: true }).waitFor();
  assert.equal(
    await p
      .getByRole("textbox", { name: "Campaign brief", exact: true })
      .inputValue(),
    "",
  );
  await p.locator(".research-card > summary").click();
  await p
    .getByText(
      "External research is mocked. No current web sources were retrieved.",
      { exact: true },
    )
    .waitFor();
  await p.waitForTimeout(800);
  const saved = await json(await api.get("/api/conversations"));
  const chat = saved.chats.find((c) => c.research);
  assert.equal(chat.research.status, "mock");
  assert.equal(chat.researchEnabled, true);
  await p.reload();
  await p.getByRole("button", { name: chat.title, exact: true }).click();
  await p.getByText("Mock · no live search", { exact: true }).waitFor();
  const cited = {
    ...chat,
    id: crypto.randomUUID(),
    title: "Citation display fixture",
    research: {
      ...initial.research,
      status: "ready",
      summary: "UI fixture for a dated public source.",
      facts: [
        {
          kind: "logistics",
          claim:
            "Historical logistics evidence requires current internal capacity before a fulfillment forecast.",
          source_url: "https://www.example.com/public-report",
          published_date: "2025-11-11",
          event_date: null,
        },
      ],
      sources: [
        {
          url: "https://www.example.com/public-report",
          title: "Public logistics report",
        },
      ],
      opportunities: [
        {
          idea: "Test a delivery-window message.",
          assumptions: ["Confirmed capacity"],
          evidence_urls: ["https://www.example.com/public-report"],
        },
      ],
      missing_data: ["Current order volumes and unit margins"],
    },
  };
  await json(
    await api.put("/api/conversations", {
      data: { chats: [{ ...chat, status: "done", runId: run.id }, cited] },
    }),
  );
  await p.reload();
  await p.getByRole("button", { name: cited.title, exact: true }).click();
  await p.locator(".research-card > summary").click();
  const source = p
    .getByRole("link", { name: "Public logistics report ↗" })
    .first();
  assert.equal(
    await source.getAttribute("href"),
    "https://www.example.com/public-report",
  );
  await p
    .getByRole("heading", { name: "Campaign hypotheses", exact: true })
    .waitFor();
  await p.screenshot({ path: "/tmp/alice-research-desktop.png" });
  await p.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await p.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
    "Phone layout must not overflow",
  );
  await p.screenshot({ path: "/tmp/alice-research-mobile.png" });
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.getByRole("button", { name: chat.title, exact: true }).click();
  await p.getByRole("button", { name: "Evidence", exact: true }).click();
  await p
    .getByText(
      "External research is mocked. No current web sources were retrieved.",
      { exact: true },
    )
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Research QA passed: offline labels, zero research calls in MOCK, private snapshots, follow-up reuse, persisted run/history, default preference, tool toggle, citations, dashboard and phone layout.",
  );
} finally {
  await browser.close();
  for (const client of [api, other]) {
    await client.delete("/api/auth/account", { data: { password } });
    await client.dispose();
  }
}
