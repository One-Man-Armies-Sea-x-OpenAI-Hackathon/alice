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
  if (!(await getRun(id)))
    return Response.json({ error: "Run not found" }, { status: 404 });
  const enc = new TextEncoder();
  let closed = false,
    reading = false;
  let timer: ReturnType<typeof setInterval>;
  let seq = Math.max(
    0,
    Number(
      req.headers.get("last-event-id") ||
        new URL(req.url).searchParams.get("after"),
    ) || 0,
  );
  function stop() {
    closed = true;
    clearInterval(timer);
  }
  const stream = new ReadableStream({
    start(controller) {
      const poll = async () => {
        if (closed || reading) return;
        reading = true;
        try {
          const run = await getRun(id);
          if (closed) return;
          if (!run) {
            stop();
            controller.close();
            return;
          }
          for (const e of run.events.filter((e) => e.seq > seq)) {
            controller.enqueue(
              enc.encode(
                `id: ${e.seq}\nevent: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`,
              ),
            );
            seq = e.seq;
          }
          if (run.status !== "running") {
            stop();
            controller.close();
          }
        } catch {
          if (!closed) {
            stop();
            controller.error(new Error("Progress connection interrupted"));
          }
        } finally {
          reading = false;
        }
      };
      timer = setInterval(poll, 250);
      void poll();
    },
    cancel() {
      stop();
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
