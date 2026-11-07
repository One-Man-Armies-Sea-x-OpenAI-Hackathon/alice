import test from "node:test";
import assert from "node:assert/strict";
import {
  groundResearch,
  normalizeSourceUrl,
  safePublicTerms,
  withExternalContext,
  type ExternalContext,
} from "../src/research";
import { demos } from "../../contracts/src/demos";
import { createTask, readTask, deleteUserTasks } from "../src/tasks";

test("external findings require retrieved sources, safe links and actual ISO dates", () => {
  const result = groundResearch(
    {
      facts: [
        {
          kind: "market",
          claim: "A sourced historical observation",
          published_date: "2025-11-11",
          event_date: "2025-02-31",
          source_url: "https://example.com/report?utm_source=web#table",
        },
        {
          kind: "regulation",
          claim: "Unretrieved claim",
          published_date: null,
          event_date: null,
          source_url: "https://unretrieved.example/rule",
        },
        {
          kind: "market",
          claim: "Unsafe link",
          published_date: "2026-99-99",
          event_date: "tomorrow",
          source_url: "javascript:alert(1)",
        },
        {
          kind: "upcoming_event",
          claim: "Date not established",
          published_date: "2026-99-99",
          event_date: "tomorrow",
          source_url: "https://example.com/report",
        },
      ],
      opportunities: [
        {
          idea: "An explicitly hypothetical campaign",
          assumptions: ["Capacity is available"],
          evidence_urls: [
            "https://example.com/report#table",
            "https://invented.example",
          ],
        },
      ],
      missing_data: ["Internal capacity figures"],
    },
    [
      { url: "https://example.com/report", title: "Public report" },
      { url: "javascript:alert(1)", title: "Invalid" },
    ],
  );
  assert.equal(result.facts.length, 2);
  assert.equal(result.facts[0].source_url, "https://example.com/report");
  assert.equal(result.facts[0].event_date, null);
  assert.equal(result.facts[1].published_date, null);
  assert.equal(result.sources.length, 1);
  assert.deepEqual(result.opportunities[0].evidence_urls, [
    "https://example.com/report",
  ]);
  assert.match(result.missing_data.at(-1)!, /omitted/);
  for (const s of [
    "file:///etc/passwd",
    "data:text/html,x",
    "javascript:alert(1)",
    "broken",
  ])
    assert.equal(normalizeSourceUrl(s), null);
});
test("public search terms reject common secret and personal-data patterns", () => {
  const terms = {
    brand: "Shopee",
    category: "Ecommerce",
    region: "Indonesia",
    topics: ["logistics and fulfillment" as const],
    can_search: true,
    clarification: null,
  };
  assert.deepEqual(safePublicTerms(terms), [
    "Shopee",
    "Ecommerce",
    "Indonesia",
    "logistics and fulfillment",
  ]);
  for (const brand of [
    "sk-abcdefghijklmno",
    "user@example.com",
    "+62 812 1234 5678",
    "Internal budget 50000",
    "https://private.example",
  ])
    assert.equal(safePublicTerms({ ...terms, brand }), null);
  assert.equal(safePublicTerms({ ...terms, can_search: false }), null);
});
test("canonical research replaces copied context and never labels mock data as evidence", () => {
  const c = demos["langkah-run"];
  const context: ExternalContext = {
    id: "test",
    status: "ready",
    retrieved_at: "2026-11-07T00:00:00Z",
    window_days: 30,
    brand: c.brand,
    category: c.product,
    summary: "Evidence",
    facts: [],
    sources: [],
    opportunities: [],
    missing_data: ["Capacity"],
    model_calls: 2,
    search_calls: 2,
    estimated_usd: 0.02,
  };
  const enriched = withExternalContext(c, context);
  assert.equal(withExternalContext(enriched, context).notes, enriched.notes);
  assert.equal(withExternalContext(enriched).notes, c.notes);
  assert.equal(
    withExternalContext(c, { ...context, status: "mock" }).notes,
    c.notes,
  );
});
test("research progress is visible only to its owner while work continues", async () => {
  let finish!: () => void;
  const t = createTask("research-owner", "clarify", async (progress) => {
    progress("Researching current public sources");
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    return { research: { status: "ready" } };
  });
  await new Promise(setImmediate);
  assert.equal(
    readTask("research-owner", t.task_id)?.phase,
    "Researching current public sources",
  );
  assert.equal(readTask("other-owner", t.task_id), null);
  finish();
  await new Promise(setImmediate);
  assert.equal(readTask("research-owner", t.task_id)?.state, "done");
  deleteUserTasks("research-owner");
});
