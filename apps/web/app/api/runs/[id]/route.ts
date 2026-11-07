import { getRun, cancelRun } from "@alice/agents";
type C = { params: Promise<{ id: string }> };
export async function GET(_: Request, c: C) {
  const r = await getRun((await c.params).id);
  return r
    ? Response.json(r)
    : Response.json({ error: "Run not found" }, { status: 404 });
}
export async function DELETE(_: Request, c: C) {
  await cancelRun((await c.params).id);
  return Response.json({ ok: true });
}
