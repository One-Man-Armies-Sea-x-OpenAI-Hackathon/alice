import { requireUser, checkOrigin, authError } from "../../../lib/auth";
import { withAccount, storeGet, getRunSummary } from "@alice/agents";
import { startRun } from "@alice/agents";
import { CampaignSchema } from "@alice/contracts";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const ids = [
      ...new Set(
        (new URL(req.url).searchParams.get("ids") ?? "")
          .split(",")
          .filter(Boolean),
      ),
    ];
    if (ids.length > 50)
      throw new Error("Select at most 50 running simulations");
    const summaries = await Promise.all(
      ids.map(async (id) => {
        const saved = await storeGet("runs", id);
        return saved?.user_id === user.id ? getRunSummary(id) : null;
      }),
    );
    return Response.json(
      { runs: summaries.filter(Boolean) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return authError(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const c = CampaignSchema.parse(await req.json());
    if (new Set(c.variants.map((v) => v.id)).size !== c.variants.length)
      throw new Error("Every direction must have a unique ID");
    const r = await withAccount(user.id, () => startRun(c, user.id));
    return Response.json({ run_id: r.id, mock: r.mock, replay: r.replay });
  } catch (e) {
    return authError(e);
  }
}
