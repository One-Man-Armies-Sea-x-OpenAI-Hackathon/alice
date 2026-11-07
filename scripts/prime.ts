import { existsSync } from "node:fs";
for (const file of ["../.env", ".env"])
  if (existsSync(file)) process.loadEnvFile(file);
const { demos } = await import("../packages/contracts/src/demos");
const { startRun, getRun, exportRecording } =
  await import("../packages/agents/src/index");
for (const [name, campaign] of Object.entries(demos)) {
  const run = await startRun({
    ...campaign,
    location: campaign.location || "Nationwide online",
    timing: campaign.timing || "None",
  });
  while ((await getRun(run.id))?.status === "running")
    await new Promise((r) => setTimeout(r, 500));
  const final = await getRun(run.id);
  if (final?.status !== "done")
    throw new Error(final?.error || "Priming failed");
  await exportRecording(run.id, name);
  console.log(
    `${name}: recorded ${final.events.length} events (${final.mock ? "mock" : "live"}), ${final.result?.llm_calls} calls.`,
  );
}
