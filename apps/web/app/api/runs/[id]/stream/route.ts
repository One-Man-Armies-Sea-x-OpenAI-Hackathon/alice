import { ownRun, authError } from "../../../../../lib/auth";
import { getRun } from "@alice/agents";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(
  req: Request,
  c: { params: Promise<{ id: string }> },
) {
  const id = (await c.params).id;
  try {
    await ownRun(id);
  } catch (e) {
    return authError(e);
  }
  if (!(await getRun(id))) return new Response("Not found", { status: 404 });
  const enc = new TextEncoder();
  let timer: ReturnType<typeof setInterval>;
  let seq = 0;
  const stream = new ReadableStream({
    start(controller) {
      timer = setInterval(async () => {
        const r = await getRun(id);
        if (!r) return;
        for (const e of r.events.filter((e) => e.seq > seq)) {
          controller.enqueue(
            enc.encode(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`),
          );
          seq = e.seq;
        }
        if (r.status !== "running") {
          clearInterval(timer);
          controller.close();
        }
      }, 200);
    },
    cancel() {
      clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
