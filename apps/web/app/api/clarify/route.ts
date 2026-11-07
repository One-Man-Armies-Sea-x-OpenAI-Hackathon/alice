import { requireUser, checkOrigin, authError } from "../../../lib/auth";
import { withAccount } from "@alice/agents";
import { clarify } from "@alice/agents";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const { campaign, answers } = await req.json();
    return Response.json(
      await withAccount(user.id, () => clarify(campaign, answers)),
    );
  } catch (e) {
    return authError(e);
  }
}
