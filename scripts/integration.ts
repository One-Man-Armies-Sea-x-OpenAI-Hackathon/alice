import assert from "node:assert/strict";
import { demos } from "../packages/contracts/src/demos";
import { ResultSchema } from "../packages/contracts/src/index";
import {
  Budget,
  structured,
  storePut,
  storeGet,
  core,
} from "../packages/agents/src/foundation/index";
import { startRun, getRun } from "../packages/agents/src/workflow";
import { clarify } from "../packages/agents/src/intake/index";
import { z } from "zod";
process.env.MOCK = "1";
for (const depth of ["quick", "standard"] as const) {
  const start = Date.now();
  const run = await startRun({ ...demos["langkah-run"], depth });
  while (run.status === "running") await new Promise((r) => setTimeout(r, 100));
  assert.equal(run.status, "done", run.error);
  const r = ResultSchema.parse(run.result);
  assert.equal(r.personas_total, depth === "quick" ? 500 : 1500);
  assert.notEqual(r.overall.recommended, "C");
  assert.ok(
    r.risk_flags.some((f) => f.variant_id === "C" && f.severity === "high"),
  );
  assert.ok(r.fixes[0]?.rerun);
  assert.ok(run.events.every((e, i) => e.seq === i + 1));
  assert.equal(run.events.at(-1)?.type, "done");
  console.log({
    depth,
    ms: Date.now() - start,
    calls: r.llm_calls,
    hits: r.cache_hits,
    winner: r.overall.winner,
    fixScore: r.fixes[0].rerun?.after.score,
  });
}
const cl = await clarify(demos["kopi-senja"]);
assert.equal(cl.questions.length, 2);
const ready = await clarify(demos["kopi-senja"], {
  location: "Nationwide online",
  timing: "None",
});
assert.ok(ready.ready);
assert.equal(ready.questions.length, 0);
await assert.rejects(() =>
  clarify({ ...demos["langkah-run"], notes: "kill all people of a religion" }),
);
const b = new Budget(2);
const schema = z.object({ ok: z.boolean() });
await structured("cache-test", schema, "test", {}, b, {
  mock: () => ({ ok: true }),
});
const calls = b.calls;
await structured("cache-test", schema, "test", {}, b, {
  mock: () => ({ ok: false }),
});
assert.equal(b.calls, calls);
assert.ok(b.cache_hits);
const id = crypto.randomUUID();
await storePut("runs", id, { campaign: demos["langkah-run"] });
await storePut("results", id, { result: { ok: true } });
await storePut("recordings", id, { events: [] });
assert.ok(await storeGet("results", id));
await core(`/v1/store/runs/${id}`, undefined, "DELETE");
assert.equal(await storeGet("results", id), null);
assert.equal(await storeGet("recordings", id), null);
console.log(
  "Clarification, guardrail, cache, persistence and cascade checks passed.",
);
