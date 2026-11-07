import test from "node:test";
import assert from "node:assert/strict";
import { CampaignSchema, VariantSchema } from "@alice/contracts";
import { demos } from "../../contracts/src/demos";
import {
  directionId,
  nextDirectionId,
  directionColor,
  plannedCalls,
  plannedSeconds,
} from "../../../apps/web/lib/display";
import { estimate } from "../src/foundation/index";
import { startRun } from "../src/workflow";

const campaign = (count: number) => ({
  ...demos["langkah-run"],
  variants: Array.from({ length: count }, (_, i) => ({
    ...demos["langkah-run"].variants[0],
    id: directionId(i),
    label: `Direction ${directionId(i)}`,
  })),
});
test("direction IDs extend past Z without relabeling existing directions", () => {
  assert.equal(directionId(0), "A");
  assert.equal(directionId(25), "Z");
  assert.equal(directionId(26), "AA");
  assert.equal(directionId(701), "ZZ");
  assert.equal(directionId(702), "AAA");
  const ids = Array.from({ length: 28 }, (_, i) => directionId(i));
  assert.equal(new Set(ids).size, 28);
  assert.equal(nextDirectionId(ids), "AC");
  assert.equal(nextDirectionId(["B", "C"]), "A");
  for (const id of ids)
    assert.match(directionColor(id), /^var\(--variant-[abc]\)$/);
});
test("campaign contracts accept many directions and frontend estimates match the server", () => {
  for (const n of [1, 2, 4, 27, 60]) {
    const c = CampaignSchema.parse(campaign(n));
    assert.equal(c.variants.length, n);
    assert.equal(plannedCalls(c), estimate(c).calls);
    assert.equal(
      plannedSeconds(c, Number(process.env.LLM_CONCURRENCY || 8)),
      estimate(c).seconds,
    );
  }
  for (const id of ["", "a", "direction-1", "A1"])
    assert.equal(
      VariantSchema.safeParse({ ...campaign(1).variants[0], id }).success,
      false,
    );
});
test("unbounded planning never bypasses the model-call cap", async () => {
  const previous = process.env.MAX_CALLS_PER_RUN,
    demo = process.env.DEMO_CACHE;
  process.env.MAX_CALLS_PER_RUN = "16000";
  process.env.DEMO_CACHE = "0";
  try {
    const c = campaign(700);
    assert.ok(estimate(c).calls > estimate(c).cap);
    await assert.rejects(startRun(c), /exceed/i);
  } finally {
    if (previous === undefined) delete process.env.MAX_CALLS_PER_RUN;
    else process.env.MAX_CALLS_PER_RUN = previous;
    if (demo === undefined) delete process.env.DEMO_CACHE;
    else process.env.DEMO_CACHE = demo;
  }
});
