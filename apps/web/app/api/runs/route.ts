import { startRun } from "@alice/agents";
import { CampaignSchema } from "@alice/contracts";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    const c = CampaignSchema.parse(await req.json());
    const r = await startRun(c);
    return Response.json({ run_id: r.id, mock: r.mock, replay: r.replay });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Run failed" },
      { status: 400 },
    );
  }
}
