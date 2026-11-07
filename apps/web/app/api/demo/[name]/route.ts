import { demoRecording } from "@alice/agents";
export async function GET(
  _: Request,
  c: { params: Promise<{ name: string }> },
) {
  const r = await demoRecording((await c.params).name);
  return r
    ? Response.json({ ...r, replay: true })
    : Response.json(
        {
          error:
            "Demo has not been recorded yet. Run it once to prime the cache.",
        },
        { status: 404 },
      );
}
