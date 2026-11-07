import { existsSync } from "node:fs";
for (const file of ["../.env", ".env"])
  if (existsSync(file)) process.loadEnvFile(file);
const { structured, Budget } = await import("../packages/agents/src/index");
const { z } = await import("zod");
const b = new Budget(3);
for (const agent of [false, true]) {
  const output = await structured(
    "connection_test_v2",
    z.object({ ok: z.boolean() }),
    "Return ok true.",
    {},
    b,
    {
      agent,
      role: agent ? "analysis" : "reaction",
      mock: () => ({ ok: true }),
    },
  );
  console.log({
    path: agent ? "Agents SDK" : "Responses",
    output,
    calls: b.calls,
    cache_hits: b.cache_hits,
  });
}
