import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
for (const f of ["../.env", ".env"]) if (existsSync(f)) process.loadEnvFile(f);
const { structured, Budget, core, prompt, models } =
  await import("../packages/agents/src/foundation/index");
const { ReactionSchema } = await import("../packages/contracts/src/index");
const { holywingsCase } = await import("../apps/web/lib/history-case");
const campaign = {
  id: "holywings-qualitative-check",
  campaign_type: "business",
  brand: "Holywings",
  product: "Adult venue alcohol promotion",
  objective: "Evaluate pre-launch cultural risk",
  channels: ["instagram"],
  location: "Indonesia",
  target_regions: [],
  outdoor_regions: [],
  timing: "22 June 2022",
  notes: holywingsCase.brief,
  depth: "quick",
  seed: 42,
  tools: { risk: true, calendar: true, rewrite: false },
  variants: [
    {
      id: "A",
      label: "Original promotion",
      headline: "Promo untuk pemilik nama Muhammad dan Maria",
      copy: "Minuman beralkohol gratis untuk pelanggan dewasa dengan nama Muhammad atau Maria.",
      visual_description:
        "An Instagram promotion displaying those names alongside alcohol.",
      attachment_ids: [],
      ai_drafted: false,
    },
  ],
};
const audience = await core("/v1/audience", {
  campaign: { ...campaign, individual_agents: true },
  depth: "quick",
  seed: 42,
});
const selected: any[] = [];
for (const dimension of ["region", "religion"])
  for (const a of audience.archetypes) {
    if (!selected.some((x) => x.segment[dimension] === a.segment[dimension]))
      selected.push(a);
  }
for (const a of audience.archetypes) {
  if (selected.length >= 20) break;
  if (!selected.some((x) => x.id === a.id)) selected.push(a);
}
const b = new Budget(24);
const reactions = await Promise.all(
  selected.slice(0, 20).map((a) =>
    structured(
      "historical_individual_check",
      ReactionSchema,
      "You are one synthetic adult with the supplied individual personality. Assess only the supplied campaign text as a pre-launch scenario; do not use knowledge of subsequent events. " +
        prompt("archetype-reaction") +
        "\n" +
        prompt("fewshot-bahasa"),
      { campaign, archetype: a, variant: campaign.variants[0] },
      b,
      {
        role: "reaction",
        mock: () => {
          throw new Error("Run this check only with real model access");
        },
      },
    ),
  ),
);
const religion_flags = reactions.filter(
  (r) => r.backlash_category === "sara_religion",
);
const report = {
  date: new Date().toISOString(),
  model: models().reaction,
  sample_size: reactions.length,
  seed: 42,
  model_calls: b.calls,
  cache_hits: b.cache_hits,
  individual_judgments_identifying_religious_sensitivity: religion_flags.length,
  interpretation:
    "A qualitative check of whether individual judgments notice the documented name/alcohol sensitivity. This is not a public backlash percentage, a blind held-out validation or causal evidence for business consequences.",
  sources: holywingsCase.facts.map((f) => ({ date: f.date, url: f.url })),
  reactions,
};
await mkdir("evals", { recursive: true });
await writeFile(
  "evals/holywings-qualitative.json",
  JSON.stringify(report, null, 2),
);
console.log({
  model: report.model,
  sample: report.sample_size,
  religious_sensitivity_judgments: religion_flags.length,
  calls: b.calls,
  hits: b.cache_hits,
});
