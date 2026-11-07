import { existsSync } from "node:fs";
for (const file of ["../.env", ".env"])
  if (existsSync(file)) process.loadEnvFile(file);
const { demos } = await import("../packages/contracts/src/demos");
const { startRun, exportRecording } =
  await import("../packages/agents/src/index");
const start = Date.now();
const run = await startRun({ ...demos["langkah-run"], depth: "standard" });
let seq = 0;
while (run.status === "running") {
  for (const e of run.events.slice(seq)) {
    if (e.type === "stage") console.log(e.data.id);
    seq = e.seq;
  }
  await new Promise((r) => setTimeout(r, 1000));
}
if (run.status !== "done") throw new Error(run.error);
await exportRecording(run.id, "langkah-run-standard");
console.log({
  status: run.status,
  ms: Date.now() - start,
  calls: run.result?.llm_calls,
  failures: run.result?.failures,
  winner: run.result?.overall.winner,
  confidence: run.result?.overall.confidence,
  flags: run.result?.risk_flags.length,
});
