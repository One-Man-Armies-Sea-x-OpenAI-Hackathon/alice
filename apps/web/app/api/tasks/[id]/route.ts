import { readTask } from "@alice/agents";
import { requireUser, authError } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function GET(_: Request, c: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const task = readTask(user.id, (await c.params).id);
    return task
      ? Response.json(task, { headers: { "Cache-Control": "no-store" } })
      : Response.json(
          {
            error:
              "Processing task not found. The server may have restarted; please try again.",
          },
          { status: 404 },
        );
  } catch (e) {
    return authError(e);
  }
}
