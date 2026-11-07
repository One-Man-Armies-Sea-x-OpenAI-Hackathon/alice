import { ownRun, checkOrigin, authError } from "../../../../../lib/auth";
import { getRun, translate, Budget, withAccount } from "@alice/agents";
export async function POST(
  req: Request,
  c: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const id = (await c.params).id;
    const u = await ownRun(id);
    const run = await getRun(id);
    const body = await req.json();
    if (
      !Array.isArray(body.strings) ||
      body.strings.length > 3 ||
      body.strings.some(
        (s: unknown) =>
          typeof s !== "string" ||
          !run?.reactions.some((r) => r.sample_comment === s || r.reason === s),
      )
    )
      throw new Error("Choose up to three comments from this run");
    return Response.json(
      await withAccount(u.id, () => translate(body.strings, new Budget(3))),
    );
  } catch (e) {
    return authError(e);
  }
}
