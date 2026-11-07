import { ownRun, checkOrigin, authError } from "../../../../../lib/auth";
import { withAccount } from "@alice/agents";
import { refix } from "@alice/agents";
export async function POST(
  req: Request,
  c: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const id = (await c.params).id;
    const user = await ownRun(id);
    const body = await req.json();
    return Response.json(
      await withAccount(user.id, () => refix(id, body.flag_id)),
    );
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Fix failed" },
      { status: 400 },
    );
  }
}
