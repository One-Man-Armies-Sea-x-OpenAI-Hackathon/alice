import { refix } from "@alice/agents";
export async function POST(
  req: Request,
  c: { params: Promise<{ id: string }> },
) {
  try {
    const body = await req.json();
    return Response.json(await refix((await c.params).id, body.flag_id));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Fix failed" },
      { status: 400 },
    );
  }
}
