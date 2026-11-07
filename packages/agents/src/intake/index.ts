import {
  CampaignSchema,
  ClarifierSchema,
  GuardrailSchema,
  type Campaign,
} from "@alice/contracts";
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
) {
  const c = CampaignSchema.parse(raw);
  const b = new Budget(8);
  const decision = await guardrail(c, b);
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
      " Never ask about a field already answered. At most three questions across the entire conversation. If questions have all been answered return ready.",
    { campaign: c, answers },
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
    campaign: CampaignSchema.parse(next),
    questions: result.questions.filter((q) => !answers[q.id]),
    ready: result.ready || result.questions.every((q) => !!answers[q.id]),
  };
}
