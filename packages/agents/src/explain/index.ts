import {
  ExplainSchema,
  TranslationSchema,
  type Result,
} from "@alice/contracts";
import { structured, prompt, Budget } from "../foundation/index";
import { mockEnglish } from "../mock";
export async function explain(result: Result, b: Budget) {
  let output = await structured(
    "explainer",
    ExplainSchema,
    prompt("explain-and-insights"),
    {
      per_variant: result.per_variant,
      ranking: result.ranking,
      overall: result.overall,
      risk_flags: result.risk_flags,
    },
    b,
    {
      mock: () => ({
        rows: result.ranking.map((row) => ({
          dimension: row.dimension,
          group: row.group,
          why:
            row.margin < result.overall.robustness.noise_floor
              ? "Too close to call within the model noise floor."
              : `Variant ${row.winner} leads on the combined simulated reach, engagement, sentiment and backlash score.`,
        })),
        insights: [
          result.overall.recommendation_note ||
            "Audience segments respond differently to the same creative direction.",
          "These are synthetic audience reactions, not measured public opinion.",
          "Review the regional differences before choosing placement.",
        ],
        next_steps: [
          "Review risk flags before launch.",
          "Test the creative with a small real audience.",
          "Compare with Standard depth.",
        ],
      }),
    },
  );
  const input = {
    per_variant: result.per_variant,
    ranking: result.ranking,
    overall: result.overall,
    risk_flags: result.risk_flags,
  };
  const allowed = new Set(JSON.stringify(input).match(/\d+(?:\.\d+)?/g) ?? []);
  const valid = (text: string) =>
    (text.match(/\d+(?:\.\d+)?/g) ?? []).every((n) => allowed.has(n));
  const allTexts = () => [
    ...output.rows.map((x) => x.why),
    ...output.insights,
    ...output.next_steps,
  ];
  if (!allTexts().every(valid)) {
    output = await structured(
      "explainer_retry",
      ExplainSchema,
      prompt("explain-and-insights") +
        " A previous response introduced unsupported numbers. Use no numeric literals in prose; use the dimension/group identifiers only in their designated fields.",
      input,
      b,
      { sample: 2, mock: () => output },
    );
  }
  // A narrative failure must not discard valid numeric results. Reject only the unsupported prose.
  output.rows = output.rows.map((row) => ({
    ...row,
    why: valid(row.why)
      ? row.why
      : "Review the simulated reach, engagement, sentiment and backlash figures for this segment.",
  }));
  output.insights = output.insights.filter(valid);
  output.next_steps = output.next_steps.filter(valid);
  if (!output.insights.length)
    output.insights = [
      "Review the segment metrics and uncertainty before making a launch decision.",
    ];
  return output;
}
export async function translate(texts: string[], b: Budget) {
  const input = [...new Set(texts)].filter(Boolean);
  const result = await structured(
    "translations",
    TranslationSchema,
    prompt("translate-display"),
    { strings: input },
    b,
    {
      role: "reaction",
      mock: () => ({
        translations: input.map((source) => ({
          source,
          english: mockEnglish(source),
        })),
      }),
    },
  );
  const bySource = new Map(result.translations.map((t) => [t.source, t]));
  if (input.some((s) => !bySource.has(s)))
    throw new Error("Translation response omitted shown text");
  return input.map((s) => bySource.get(s)!);
}
