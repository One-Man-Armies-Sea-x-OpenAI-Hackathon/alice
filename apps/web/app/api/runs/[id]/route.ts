import { getRun, getRunSummary, cancelRun } from "@alice/agents";
import { ownRun, checkOrigin, authError } from "../../../../lib/auth";
type C = { params: Promise<{ id: string }> };
export async function GET(req: Request, c: C) {
  try {
    const id = (await c.params).id;
    await ownRun(id);
    if (new URL(req.url).searchParams.get("summary") === "1")
      return Response.json(await getRunSummary(id), {
        headers: { "Cache-Control": "no-store" },
      });
    const run = await getRun(id);
    return Response.json(
      run && new URL(req.url).searchParams.get("recording") !== "1"
        ? { ...run, events: [] }
        : run,
    );
  } catch (e) {
    return authError(e);
  }
}
export async function DELETE(req: Request, c: C) {
  try {
    checkOrigin(req);
    const id = (await c.params).id;
    await ownRun(id);
    await cancelRun(id);
    return Response.json({ ok: true });
  } catch (e) {
    return authError(e);
  }
}
