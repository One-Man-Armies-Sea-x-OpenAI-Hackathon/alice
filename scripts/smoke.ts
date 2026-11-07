import assert from "node:assert/strict";
import { demos } from "../packages/contracts/src/demos";
import { ResultSchema } from "../packages/contracts/src/index";
const base = process.env.WEB_BASE_URL || "http://127.0.0.1:3000";
const req = async (path: string, body?: unknown) => {
  const r = await fetch(
    base + path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const v = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(v));
  return v;
};
console.log(await req("/api/health"));
for (const depth of ["quick", "standard"] as const) {
  const c = { ...demos["langkah-run"], depth };
  const start = Date.now();
  const started = await req("/api/runs", c);
  let run;
  for (let i = 0; i < 300; i++) {
    run = await req(`/api/runs/${started.run_id}`);
    if (run.status !== "running") break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  assert.equal(run.status, "done", run.error);
  const result = ResultSchema.parse(run.result);
  assert.equal(result.personas_total, depth === "quick" ? 500 : 1500);
  assert.notEqual(result.overall.recommended, "C");
  assert.ok(
    result.risk_flags.some(
      (f) => f.variant_id === "C" && f.severity === "high",
    ),
  );
  assert.ok(result.fixes.length);
  assert.ok(run.events.every((e: any, i: number) => e.seq === i + 1));
  assert.equal(run.events.at(-1).type, "done");
  console.log({
    depth,
    elapsed_ms: Date.now() - start,
    calls: result.llm_calls,
    cache_hits: result.cache_hits,
    flags: result.risk_flags.length,
    fixes: result.fixes.length,
    winner: result.overall.winner,
    confidence: result.overall.confidence,
  });
}
