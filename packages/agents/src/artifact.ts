import { z } from "zod";
import { VariantSchema } from "@alice/contracts";
import { randomUUID } from "node:crypto";
import { getRun } from "./workflow";
import { structured, Budget, storeGet, storePut } from "./foundation/index";
export const chartSchema = z.object({
  id: z.string(),
  title: z.string().max(120),
  kind: z.enum(["bars", "table", "line"]),
  dimension: z.enum(["region", "age", "platform", "religion", "tier"]),
  metric: z.enum([
    "score",
    "reach",
    "sentiment",
    "engagement",
    "backlash",
    "anger_reach",
  ]),
  variant_id: VariantSchema.shape.id,
});
export const scenarioSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  days: z.number().int().min(1).max(180),
  daily_exposure: z.number().min(0).max(1),
  organic_multiplier: z.number().min(0).max(3),
  sentiment_decay: z.number().min(0).max(0.2),
});
export type Scenario = z.infer<typeof scenarioSchema>;
export type Artifact = {
  revision: number;
  messages: {
    id: string;
    role: "user" | "assistant";
    text: string;
    created: string;
  }[];
  charts: z.infer<typeof chartSchema>[];
  scenario: Scenario;
};
export function emptyArtifact(): Artifact {
  return {
    revision: 1,
    messages: [],
    charts: [],
    scenario: {
      start_date: new Date().toISOString().slice(0, 10),
      days: 30,
      daily_exposure: 0.04,
      organic_multiplier: 1,
      sentiment_decay: 0.01,
    },
  };
}
export async function readArtifact(id: string): Promise<Artifact> {
  const saved = await storeGet("runs", id);
  if (!saved) throw new Error("Run not found");
  return saved.workspace ?? emptyArtifact();
}
export async function saveArtifact(id: string, a: Artifact) {
  const saved = await storeGet("runs", id);
  if (!saved) throw new Error("Run not found");
  await storePut("runs", id, { ...saved, workspace: a });
  return a;
}
const answerSchema = z.object({
  reply: z.string().max(3000),
  action: z.enum(["answer", "visualize", "scenario", "revise_campaign"]),
  chart: chartSchema.nullable(),
  scenario: scenarioSchema.nullable(),
  revised_notes: z.string().nullable(),
  revised_variants: z.array(VariantSchema).min(1).nullable(),
});
const pending = new Set<string>();
export async function discuss(id: string, message: string) {
  if (!message.trim() || message.length > 6000)
    throw new Error("Write a question of up to 6,000 characters");
  if (pending.has(id)) throw new Error("A reply is already being prepared");
  pending.add(id);
  try {
    const run = await getRun(id);
    if (!run?.result || run.status !== "done")
      throw new Error("A completed simulation is required");
    let artifact = await readArtifact(id);
    const input = {
      question: message,
      conversation: artifact.messages.slice(-12),
      campaign: run.campaign,
      metrics: run.result.per_variant,
      ranking: run.result.ranking,
      risks: run.result.risk_flags,
      robustness: run.result.overall.robustness,
      artifact: { charts: artifact.charts, scenario: artifact.scenario },
      limitations:
        "Synthetic individual judgments are not representative public polling. No actual audience percentages or financial losses are established for Holywings.",
    };
    const b = new Budget(3);
    const response = await structured(
      "dashboard_dialogue",
      answerSchema,
      `You are Alice, continuing a campaign analysis conversation. Use only the supplied simulation metrics and conversation. Clearly distinguish model judgments, hypothetical calendar scenarios and observed evidence. Never invent numbers, quotations, legal outcomes, real public opinion, or claim causal validation. A visualization may only use the allowed metrics and dimensions. For a timeline use action scenario and explicit assumptions. For a changed campaign or new facts that need different reactions, return revised_notes containing a complete revised campaign brief and revised_variants containing complete changed variants with their original IDs and explain that a new simulation is required; never pretend existing numbers were recomputed. For an answer set other fields null. For a chart set a stable id and the title in English. Respond in English.`,
      input,
      b,
      {
        agent: true,
        mock: (): z.infer<typeof answerSchema> => {
          const visualize = /chart|graph|visual|plot|compare/i.test(message);
          const timeline = /day|month|timeline|scenario/i.test(message);
          return {
            reply: timeline
              ? "I added a calendar scenario with explicit exposure and sentiment assumptions. It does not convert the original spread ticks into real days."
              : visualize
                ? "I added a visualization using the existing simulation metrics. The underlying reactions and scores have not changed."
                : "This answer uses the current simulated results. They are directional judgments, not measured public opinion.",
            action: timeline ? "scenario" : visualize ? "visualize" : "answer",
            chart: visualize
              ? {
                  id: randomUUID(),
                  title: "Impact by age",
                  kind: "bars",
                  dimension: /platform/i.test(message) ? "platform" : "age",
                  metric: /backlash/i.test(message) ? "backlash" : "score",
                  variant_id:
                    run.campaign.variants.find(
                      (v) =>
                        v.id ===
                        message
                          .match(/(?:direction|variant)\s+([a-z]+)/i)?.[1]
                          ?.toUpperCase(),
                    )?.id ?? run.campaign.variants[0].id,
                }
              : null,
            scenario: timeline ? artifact.scenario : null,
            revised_notes: null,
            revised_variants: null,
          };
        },
      },
    );
    artifact = await readArtifact(id);
    if (response.action === "visualize" && response.chart) {
      if (
        !run.result.per_variant.some(
          (v) => v.variant_id === response.chart!.variant_id,
        )
      )
        throw new Error("Chart requested an unavailable variant");
      artifact.charts = [
        ...artifact.charts.filter((c) => c.id !== response.chart!.id),
        response.chart,
      ].slice(-8);
    }
    if (response.action === "scenario" && response.scenario) {
      if (!Number.isFinite(Date.parse(response.scenario.start_date)))
        throw new Error("Invalid scenario date");
      artifact.scenario = response.scenario;
    }
    artifact.revision++;
    const created = new Date().toISOString();
    artifact.messages.push(
      { id: randomUUID(), role: "user", text: message, created },
      { id: randomUUID(), role: "assistant", text: response.reply, created },
    );
    await saveArtifact(id, artifact);
    return {
      artifact,
      draft:
        response.action === "revise_campaign" && response.revised_notes
          ? {
              ...run.campaign,
              notes: response.revised_notes,
              variants: response.revised_variants ?? run.campaign.variants,
            }
          : null,
      llm_calls: b.calls,
      cache_hits: b.cache_hits,
    };
  } finally {
    pending.delete(id);
  }
}
