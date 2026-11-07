import { requireUser, checkOrigin, authError } from "../../../lib/auth";
import { withAccount, createTask } from "@alice/agents";
import { clarify } from "@alice/agents";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser();
    const { campaign, answers, research, research_id } = await req.json();
    const work = (progress?: (phase: string) => void) =>
      withAccount(user.id, () =>
        clarify(campaign, answers, {
          research:
            typeof research === "boolean"
              ? research
              : user.preferences?.external_research !== false,
          userId: user.id,
          researchId: typeof research_id === "string" ? research_id : undefined,
          onProgress: progress,
        }),
      );
    if (req.headers.get("prefer")?.includes("respond-async"))
      return Response.json(createTask(user.id, "clarify", work), {
        status: 202,
      });
    return Response.json(await work());
  } catch (e) {
    return authError(e);
  }
}
