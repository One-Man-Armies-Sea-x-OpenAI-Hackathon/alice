import {
  CampaignSchema,
  ClarifierSchema,
  GuardrailSchema,
  type Campaign,
} from "@alice/contracts";
import {
  researchCampaign,
  withExternalContext,
  ownedResearch,
  type ExternalContext,
} from "../research";
import { structured, prompt, Budget } from "../foundation/index";
export async function guardrail(c: Campaign, budget: Budget) {
  const result = await structured(
    "guardrail",
    GuardrailSchema,
    prompt("guardrail"),
    { brief: c.notes, variants: c.variants },
    budget,
    {
      role: "reaction",
      agent: true,
      mock: () => ({
        decision: /\b(kill all|exterminate|harass|doxx)\b/i.test(c.notes)
          ? "blocked"
          : "allowed",
        reason:
          "Alice helps evaluate and reduce campaign risks; it cannot help target groups for harm.",
      }),
    },
  );
  if (result.decision === "blocked") throw new Error(result.reason);
  return result;
}
export async function clarify(
  raw: unknown,
  answers: Record<string, string> = {},
  options: {
    research?: boolean;
    userId?: string;
    researchId?: string;
    onProgress?: (phase: string) => void;
  } = {},
) {
  let c = CampaignSchema.parse(raw);
  if (new Set(c.variants.map((v) => v.id)).size !== c.variants.length)
    throw new Error("Every direction must have a unique ID");
  const b = new Budget(16);
  options.onProgress?.("Checking campaign safety");
  const decision = await guardrail(c, b);
  let external: ExternalContext | undefined = options.userId
    ? await ownedResearch(options.userId, options.researchId)
    : undefined;
  c = withExternalContext(c, external);
  if (
    options.research &&
    options.userId &&
    (!external || external.status === "needs_context")
  ) {
    const researched = await researchCampaign(
      {
        ...c,
        notes:
          c.notes +
          (Object.keys(answers).length
            ? "\nClarifications: " + JSON.stringify(answers)
            : ""),
      },
      b,
      options.userId,
      options.onProgress,
    );
    c = researched.campaign;
    external = researched.context;
  }
  options.onProgress?.(
    external?.status === "ready"
      ? "Planning with sourced external context"
      : "Reading the brief",
  );
  const questions: {
    id: string;
    text: string;
    options: string[];
    allows_free_text: boolean;
  }[] = [];
  if (!c.channels.length && !answers.channel)
    questions.push({
      id: "channel",
      text: "Where will the campaign run?",
      options: [
        "TikTok",
        "Instagram",
        "Outdoor / billboard",
        "YouTube",
        "WhatsApp",
        "Multiple channels",
      ],
      allows_free_text: true,
    });
  if (!c.location && !answers.location)
    questions.push({
      id: "location",
      text: "Where is the campaign being placed?",
      options: ["Nationwide online", "Jabodetabek", "Java", "Outside Java"],
      allows_free_text: true,
    });
  if (!c.timing && !answers.timing)
    questions.push({
      id: "timing",
      text: "Is there a seasonal moment we should consider?",
      options: [
        "None",
        "Ramadan",
        "Payday week",
        "Independence Day",
        "Christmas / New Year",
      ],
      allows_free_text: true,
    });
  const result = await structured(
    "clarifier",
    ClarifierSchema,
    prompt("clarifier") +
      " Ask at most three focused questions per turn, and continue with another turn if decision-critical context remains missing. Consider intended audience, objective, event facts, timing, placement, budget and desired behavior. Do not invent historical evidence. Never repeat an answered question. Decide readiness yourself.",
    { campaign: c, answers, external_context: external ?? null },
    b,
    {
      agent: true,
      guardrail: async () => decision,
      mock: () => ({
        ready: questions.length === 0,
        questions: questions.slice(0, 3),
        extracted: {
          brand: c.brand,
          product: c.product,
          campaign_type: c.campaign_type,
          channels: c.channels,
          location: c.location,
          target_regions: c.target_regions,
          outdoor_regions: c.outdoor_regions,
          timing: c.timing,
          variants: c.variants,
          detected_missing: questions.map((q) => q.id),
        },
      }),
    },
  );
  let next: Campaign = { ...c, ...result.extracted };
  if (Object.keys(answers).length)
    next.notes =
      c.notes.split("\nConfirmed context:")[0] +
      "\nConfirmed context:\n" +
      Object.entries(answers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");
  if (answers.channel) {
    const val = answers.channel.toLowerCase();
    next.channels = val.includes("multiple")
      ? ["tiktok", "instagram", "youtube", "facebook", "x", "whatsapp"]
      : val.includes("outdoor")
        ? ["outdoor"]
        : val.includes("instagram")
          ? ["instagram"]
          : val.includes("youtube")
            ? ["youtube"]
            : val.includes("whatsapp")
              ? ["whatsapp"]
              : ["tiktok"];
  }
  if (answers.location) {
    next.location = answers.location;
    next.target_regions =
      answers.location === "Jabodetabek"
        ? ["jabodetabek"]
        : answers.location === "Java"
          ? ["jabodetabek", "jawa_other"]
          : answers.location === "Outside Java"
            ? ["sumatra", "kalimantan", "sulawesi", "bali_nusa", "maluku_papua"]
            : [];
    if (next.channels.includes("outdoor"))
      next.outdoor_regions = next.target_regions;
  }
  if (answers.timing) next.timing = answers.timing;
  return {
    ...result,
    research: external,
    campaign: CampaignSchema.parse(next),
    questions: result.questions.filter((q) => !answers[q.id]),
    ready: result.ready,
  };
}
