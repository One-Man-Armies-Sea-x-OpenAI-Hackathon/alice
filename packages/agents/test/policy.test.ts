import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Budget,
  BudgetError,
  classifyError,
  estimate,
} from "../src/foundation/index";
import { recommendationGate } from "../src/workflow";
import { demos } from "../../contracts/src/demos";
import { CampaignSchema, ReactionSchema } from "@alice/contracts";
import { mockReaction, pattern } from "../src/mock";
test("budget stops at the exact cap", () => {
  const b = new Budget(2);
  b.take();
  b.take();
  assert.throws(() => b.take(), BudgetError);
  assert.equal(b.calls, 2);
});
test("credit exhaustion is distinct from rate/spend/usage limits", () => {
  assert.equal(
    classifyError({ status: 429, code: "credit_balance_exhausted" }),
    "credit",
  );
  for (const code of [
    "slow_down",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
    "organization_usage_limit_exceeded",
    "insufficient_quota",
  ])
    assert.equal(classifyError({ status: 429, code }), "rate");
});
test("high severity top scorer cannot be recommended", () => {
  const r: any = {
    risk_flags: [{ variant_id: "C", severity: "high" }],
    per_variant: [
      { variant_id: "A", overall: { score: 65 } },
      { variant_id: "C", overall: { score: 80 } },
    ],
    overall: { winner: "C" },
  };
  recommendationGate(r);
  assert.equal(r.overall.recommended, "A");
  assert.match(r.overall.recommendation_note, /do not launch/);
  r.risk_flags.push({ variant_id: "A", severity: "high" });
  recommendationGate(r);
  assert.equal(r.overall.recommended, null);
});
test("demo campaigns validate and estimates scale", () => {
  for (const c of Object.values(demos)) CampaignSchema.parse(c);
  const c = demos["langkah-run"];
  assert.ok(estimate({ ...c, depth: "standard" }).calls > estimate(c).calls);
  assert.ok(
    estimate({ ...c, tools: { ...c.tools, rewrite: false } }).calls <
      estimate(c).calls,
  );
});
test("risky patterns and mock reactions stay bounded", () => {
  assert.equal(pattern(demos["langkah-run"].variants[2])?.id, "flag_misuse");
  assert.equal(pattern(demos["tiket-ceria"].variants[2])?.id, "santa_hijab");
  const a: any = {
    id: "arc-0",
    segment: { age_band: "45+", region: "jawa_other", religion: "islam" },
  };
  ReactionSchema.parse(
    mockReaction(demos["langkah-run"], a, demos["langkah-run"].variants[2]),
  );
  assert.equal(pattern(demos["langkah-run"].variants[0]), undefined);
});
test("selling-point findings require repeated low-interest comments", async () => {
  const { effectivenessFindings } = await import("../src/effectiveness");
  const c = {
    ...demos["langkah-run"],
    variants: [demos["langkah-run"].variants[0]],
  };
  const people = Array.from({ length: 4 }, (_, i) => ({
    id: `arc-${i}`,
    segment: {
      region: "jabodetabek",
      age_band: "25-34",
      platform: "tiktok",
      religion: "islam",
    },
  })) as any;
  const rs = people.map((a: any) => ({
    ...mockReaction(c, a, c.variants[0]),
    attention: 0.2,
    sentiment: 0,
    reason: "Pesannya terlalu umum, manfaat produknya belum jelas.",
    sample_comment: "Apa keunggulan yang beda dari produk ini?",
  }));
  const result: any = {
    per_variant: [
      {
        variant_id: "A",
        by_dimension: { region: [{ group: "jabodetabek", n: 4, backlash: 0 }] },
      },
    ],
  };
  assert.equal(
    effectivenessFindings(c, result, rs, people)[0].rule_id,
    "weak_value_proposition",
  );
  assert.equal(
    effectivenessFindings(
      c,
      result,
      rs.map((r: any) => ({ ...r, attention: 0.8 })),
      people,
    ).length,
    0,
  );
});
