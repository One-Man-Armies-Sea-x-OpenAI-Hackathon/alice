import { core, mockMode, poolStatus, models } from "@alice/agents";
export async function GET() {
  try {
    return Response.json({
      ok: true,
      core: await core("/v1/health"),
      mock: mockMode(),
      pool: poolStatus(),
      models: models(),
    });
  } catch {
    return Response.json(
      { ok: false, error: "Core is unavailable" },
      { status: 503 },
    );
  }
}
