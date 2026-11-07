import { core, mockMode, poolStatus, models } from "@alice/agents";
export async function GET() {
  try {
    return Response.json({
      ok: true,
      core: await core("/v1/health"),
      mock: mockMode(),
      pool: poolStatus(),
      models: models(),
      limits: {
        max_calls: Number(process.env.MAX_CALLS_PER_RUN || 16000),
        concurrency: Number(process.env.LLM_CONCURRENCY || 8),
      },
    });
  } catch {
    return Response.json(
      { ok: false, error: "Core is unavailable" },
      { status: 503 },
    );
  }
}
