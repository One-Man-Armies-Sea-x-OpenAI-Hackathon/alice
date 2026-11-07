import { ownRun, checkOrigin, authError } from "../../../../../lib/auth";
import { withAccount, createTask } from "@alice/agents";
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
    const work = () => withAccount(user.id, () => discuss(id, body.message));
    if (req.headers.get("prefer")?.includes("respond-async"))
      return Response.json(createTask(user.id, "discussion", work), {
        status: 202,
      });
    return Response.json(await work());
  } catch (e) {
    return authError(e);
  }
}
