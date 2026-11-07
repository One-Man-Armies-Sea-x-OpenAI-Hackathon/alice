import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Campaign, Result } from "@alice/contracts";
import type { ExternalContext } from "../src/research";
import { dashboardContext, emptyArtifact } from "../src/artifact";
const saved = JSON.parse(
  readFileSync(
    new URL("../../../recordings/langkah-run.json", import.meta.url),
    "utf8",
  ),
);
const campaign: Campaign = {
  ...saved.campaign,
  brand: "Innilo",
  notes: "Assess our skincare launch.",
};
const result: Result = saved.result;

test("dashboard context contains only this campaign's research, with no default historical case", () => {
  const research: ExternalContext = {
    id: "innilo-research",
    status: "ready",
    retrieved_at: "2026-11-07T00:00:00Z",
    window_days: 30,
    brand: "Innilo",
    category: "Skincare",
    summary: "Campaign research",
    facts: [],
    opportunities: [],
    missing_data: [],
    sources: [
      { url: "https://example.com/innilo-report", title: "Innilo research" },
    ],
    model_calls: 0,
    search_calls: 0,
    estimated_usd: 0,
  };
  const input = dashboardContext(
    { campaign, result, research },
    emptyArtifact(),
    "What does the evidence establish?",
  );
  assert.equal(input.campaign.brand, "Innilo");
  assert.deepEqual(input.external_context, research);
  assert.doesNotMatch(JSON.stringify(input), /holywings|qualitative check/i);
  const other = dashboardContext(
    { campaign: { ...campaign, brand: "Another campaign" }, result },
    emptyArtifact(),
    "Summarize this campaign",
  );
  assert.equal(other.external_context, null);
  assert.doesNotMatch(JSON.stringify(other), /innilo-report|holywings/i);
});

test("campaign-specific user input is preserved without a global historical limitation", () => {
  const input = dashboardContext(
    { campaign: { ...campaign, brand: "Holywings" }, result },
    emptyArtifact(),
    "Review my supplied campaign",
  );
  assert.equal(input.campaign.brand, "Holywings");
  assert.doesNotMatch(input.limitations, /holywings/i);
});
