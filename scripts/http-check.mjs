import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const saved = JSON.parse(await readFile("recordings/langkah-run.json", "utf8"));
const base = "http://127.0.0.1:3000";
const response = await fetch(base + "/api/runs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(saved.campaign),
});
const body = await response.json();
assert.ok(response.ok, JSON.stringify(body));
const stream = await fetch(base + `/api/runs/${body.run_id}/stream`);
const reader = stream.body.getReader();
let buffer = "",
  count = 0;
const dec = new TextDecoder();
for (;;) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += dec.decode(value);
  count++;
  if (buffer.includes("event: reaction")) {
    await reader.cancel();
    break;
  }
}
assert.ok(buffer.includes("event: stage"));
let run;
for (let i = 0; i < 120; i++) {
  run = await (await fetch(base + `/api/runs/${body.run_id}`)).json();
  if (run.status !== "running") break;
  await new Promise((r) => setTimeout(r, 1000));
}
assert.equal(run.status, "done", run.error);
assert.ok(run.events.every((e, i) => e.seq === i + 1));
assert.equal(run.events.at(-1).type, "done");
console.log({
  httpRun: run.status,
  streamChunks: count,
  calls: run.result.llm_calls,
  hits: run.result.cache_hits,
  disconnectedClientStillCompleted: true,
});
