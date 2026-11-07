import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requireUser, authError } from "../../../../lib/auth";
import { root } from "@alice/agents";
export async function GET() {
  try {
    await requireUser();
    const r = JSON.parse(
      await readFile(
        resolve(root(), "evals/holywings-qualitative.json"),
        "utf8",
      ),
    );
    return Response.json({
      model: r.model,
      sample_size: r.sample_size,
      recognized: r.individual_judgments_identifying_religious_sensitivity,
      interpretation: r.interpretation,
      date: r.date,
      sources: r.sources,
    });
  } catch (e) {
    return authError(e);
  }
}
