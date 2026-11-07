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

test("network and SDK output failures are not mislabeled as model-access failures", () => {
  for (const name of [
    "APIConnectionError",
    "APIConnectionTimeoutError",
    "APITimeoutError",
  ])
    assert.equal(classifyError({ name }), "transient");
  assert.equal(
    classifyError({ cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }),
    "transient",
  );
  for (const name of [
    "ZodError",
    "SyntaxError",
    "ModelBehaviorError",
    "MaxTurnsExceededError",
  ])
    assert.equal(classifyError({ name }), "output");
  assert.equal(classifyError({ status: 400 }), "fatal");
});

test("grouped estimates use archetypes while preserving the full agent audience", () => {
  const c = {
    ...demos["langkah-run"],
    variants: demos["langkah-run"].variants.slice(0, 2),
    tools: { risk: false, rewrite: false, calendar: true },
  };
  const quick = estimate(c),
    standard = estimate({ ...c, depth: "standard" });
  assert.equal(quick.personas, 500);
  assert.equal(quick.archetypes, 24);
  assert.equal(quick.reaction_calls, 72); // 48 initial + 24 fresh winner reactions.
  assert.equal(quick.calls, 96);
  assert.equal(quick.seconds, 190);
  assert.equal(standard.personas, 1500);
  assert.equal(standard.archetypes, 48);
  assert.equal(standard.reaction_calls, 144);
});

test("effectiveness fixes count represented agents rather than treating unequal groups equally", async () => {
  const { effectivenessFindings } = await import("../src/effectiveness");
  const c = {
    ...demos["langkah-run"],
    variants: [demos["langkah-run"].variants[0]],
  };
  const people = Array.from({ length: 3 }, (_, i) => ({
    id: `arc-${i}`,
    persona_count: i === 0 ? 80 : 10,
    segment: {
      region: "jabodetabek",
      age_band: "25-34",
      platform: "instagram",
      religion: "islam",
    },
  })) as any;
  const weak = (a: any) => ({
    ...mockReaction(c, a, c.variants[0]),
    attention: 0.2,
    sentiment: 0,
    reason: "Manfaatnya belum jelas",
    sample_comment: "Pesannya terlalu umum",
  });
  const strong = (a: any) => ({
    ...mockReaction(c, a, c.variants[0]),
    attention: 0.8,
    sentiment: 0.5,
    reason: "Manfaatnya relevan",
    sample_comment: "Menarik",
  });
  const result: any = {
    per_variant: [
      {
        variant_id: "A",
        by_dimension: {
          region: [{ group: "jabodetabek", n: 100, backlash: 0 }],
        },
      },
    ],
  };
  assert.equal(
    effectivenessFindings(
      c,
      result,
      [weak(people[0]), strong(people[1]), strong(people[2])],
      people,
    ).length,
    1,
  );
  assert.equal(
    effectivenessFindings(
      c,
      result,
      [strong(people[0]), weak(people[1]), weak(people[2])],
      people,
    ).length,
    0,
  );
});
