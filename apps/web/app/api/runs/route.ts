import { requireUser, checkOrigin, authError } from "../../../lib/auth";
import { withAccount } from "@alice/agents";
import { startRun } from "@alice/agents";
import { CampaignSchema } from "@alice/contracts";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const c = CampaignSchema.parse(await req.json());
    const r = await withAccount(user.id, () => startRun(c, user.id));
    return Response.json({ run_id: r.id, mock: r.mock, replay: r.replay });
  } catch (e) {
    return authError(e);
  }
}
