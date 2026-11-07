import { ownRun, checkOrigin, authError } from "../../../../../lib/auth";
import { withAccount } from "@alice/agents";
import {
  getRun,
  core,
  readArtifact,
  saveArtifact,
  scenarioSchema,
} from "@alice/agents";
export async function POST(
  req: Request,
  c: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const id = (await c.params).id;
    await ownRun(id);
    const run = await getRun(id);
    if (!run?.result) throw new Error("Completed result required");
    const assumptions = scenarioSchema.parse(await req.json());
    if (!Number.isFinite(Date.parse(assumptions.start_date)))
      throw new Error("Invalid start date");
    const scenario = await core("/v1/scenario", {
      ...assumptions,
      per_variant: run.result.per_variant,
    });
    const artifact = await readArtifact(id);
    artifact.scenario = assumptions;
    artifact.revision++;
    await saveArtifact(id, artifact);
    return Response.json({
      ...scenario,
      start_date: assumptions.start_date,
      revision: artifact.revision,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Scenario failed" },
      { status: 400 },
    );
  }
}
