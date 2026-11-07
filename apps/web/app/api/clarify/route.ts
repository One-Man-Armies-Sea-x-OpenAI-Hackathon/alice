import { clarify } from "@alice/agents";
export async function POST(req: Request) {
  try {
    const { campaign, answers } = await req.json();
    return Response.json(await clarify(campaign, answers));
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Clarification failed" },
      { status: 400 },
    );
  }
}
