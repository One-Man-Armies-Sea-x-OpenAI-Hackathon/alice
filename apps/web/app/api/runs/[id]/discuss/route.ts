import { ownRun, checkOrigin, authError } from "../../../../../lib/auth";
import { withAccount } from "@alice/agents";
import { readArtifact, discuss } from "@alice/agents";
type C = { params: Promise<{ id: string }> };
export async function GET(_: Request, c: C) {
  try {
    const id = (await c.params).id;
    await ownRun(id);
    return Response.json(await readArtifact(id));
  } catch (e) {
    return authError(e);
  }
}
export async function POST(req: Request, c: C) {
  try {
    checkOrigin(req);
    const id = (await c.params).id;
    const user = await ownRun(id);
    const body = await req.json();
    if (typeof body.message !== "string") throw new Error("Message required");
    return Response.json(
      await withAccount(user.id, () => discuss(id, body.message)),
    );
  } catch (e) {
    return authError(e);
  }
}
