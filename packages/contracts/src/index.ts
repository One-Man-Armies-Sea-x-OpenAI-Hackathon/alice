import { z } from "zod";
export const regions = [
  "jabodetabek",
  "jawa_other",
  "sumatra",
  "kalimantan",
  "sulawesi",
  "bali_nusa",
  "maluku_papua",
] as const;
export const platforms = [
  "tiktok",
  "instagram",
  "youtube",
  "facebook",
  "x",
  "whatsapp",
] as const;
export const religions = [
  "islam",
  "kristen",
  "katolik",
  "hindu",
  "buddha",
  "other",
] as const;
export const dimensions = [
  "region",
  "age",
  "platform",
  "religion",
  "tier",
] as const;
export const tiers = {
  quick: { personas: 500, archetypes: 24 },
  standard: { personas: 1500, archetypes: 48 },
};
const s = z.string(),
  num = z.number(),
  strings = z.array(s),
  prob = z.number().min(0).max(1);
export const VariantSchema = z.object({
  id: z.enum(["A", "B", "C"]),
  label: s,
  headline: s,
  copy: s,
  visual_description: s,
  attachment_ids: strings,
  ai_drafted: z.boolean(),
});
export const CampaignSchema = z.object({
  id: s,
  campaign_type: z.enum(["business", "activist", "political"]),
  brand: s,
  product: s,
  objective: s,
  channels: z.array(z.enum([...platforms, "outdoor"])),
  location: s,
  target_regions: z.array(z.enum(regions)),
  outdoor_regions: z.array(z.enum(regions)),
  timing: s,
  notes: s,
  variants: z.array(VariantSchema).min(1).max(3),
  tools: z.object({
    risk: z.boolean(),
    calendar: z.boolean(),
    rewrite: z.boolean(),
  }),
  depth: z.enum(["quick", "standard"]),
  seed: z.number().int().min(0).max(2147483647),
});
export const QuestionSchema = z.object({
  id: s,
  text: s,
  options: strings,
  allows_free_text: z.boolean(),
});
export const ClarifierSchema = z.object({
  ready: z.boolean(),
  questions: z.array(QuestionSchema).max(3),
  extracted: CampaignSchema.pick({
    brand: true,
    product: true,
    campaign_type: true,
    channels: true,
    location: true,
    target_regions: true,
    outdoor_regions: true,
    timing: true,
    variants: true,
  }).extend({ detected_missing: strings }),
});
export const SegmentSchema = z.object({
  region: z.enum(regions),
  city_tier: z.enum(["metro", "tier2", "tier3"]),
  age_band: z.enum(["18-24", "25-34", "35-44", "45+"]),
  religion: z.enum(religions),
  income_band: z.enum(["low", "mid", "high"]),
  platform: z.enum(platforms),
  language_style: z.enum(["slang", "casual", "formal"]),
  religiosity_band: z.enum(["low", "mid", "high"]),
});
export const ArchetypeSchema = z.object({
  id: s,
  segment: SegmentSchema,
  weight: prob,
  persona_count: num.int(),
  blurb: s,
  label: s,
});
export const categories = [
  "none",
  "sara_religion",
  "sara_ethnicity",
  "sara_class",
  "local_norms",
  "language_tone",
  "political",
  "copycat_legal",
  "other",
] as const;
export const ReactionSchema = z.object({
  archetype_id: s,
  variant_id: s,
  attention: prob,
  sentiment: num.min(-1).max(1),
  share_likelihood: prob,
  click_likelihood: prob,
  backlash_risk: prob,
  backlash_category: z.enum(categories),
  reason: s.max(200),
  sample_comment: s.max(120),
});
export const MetricsSchema = z.object({
  n: num.int(),
  reach: prob,
  engagement: prob,
  sentiment: num.min(-1).max(1),
  backlash: prob,
  anger_reach: prob,
  score: num.min(0).max(100),
});
export const RobustnessSchema = z.object({
  noise_floor: num,
  checks_won: num.int(),
  checks_total: num.int(),
  audience_won: num.int(),
  audience_total: num.int(),
  constants_won: num.int(),
  constants_total: num.int(),
});
export const BaselineModelSchema = z.object({
  winner: s,
  summary: s,
  risks: strings,
  segment_notes: strings,
});
export const BaselineSchema = BaselineModelSchema.extend({
  missed: strings,
  baseline_only: z.array(
    z.object({ text: s, status: z.enum(["not_supported", "not_tested"]) }),
  ),
});
export const RiskFlagSchema = z.object({
  id: s,
  variant_id: s,
  severity: z.enum(["high", "medium", "low"]),
  category: z.enum(categories),
  title: s,
  explanation: s,
  segments: z.array(z.object({ key: s, backlash: prob })),
  map_region: z.enum(regions),
  evidence: z.object({ comment: s, persona_tags: strings }),
  suggested_fix_direction: s,
  rule_id: s,
});
const creative = z.object({ headline: s, copy: s, visual: s });
export const FixSchema = z.object({
  flag_id: s,
  variant_id: s,
  original: creative,
  rewrite: creative,
  changes: strings,
  self_check_new_risks: strings,
  rounds: num.int().min(1).max(2),
  status: z.enum(["cleared", "needs_human"]),
  rerun: z
    .object({
      before: MetricsSchema,
      after: MetricsSchema,
      method: z.enum(["rescored", "neutralized"]),
      archetypes_rescored: num.int(),
      control_archetypes: num.int(),
    })
    .optional(),
});
const group = MetricsSchema.extend({ group: s, share: prob });
export const PerVariantSchema = z.object({
  variant_id: s,
  label: s,
  overall: MetricsSchema,
  by_dimension: z.object({
    region: z.array(group),
    age: z.array(group),
    platform: z.array(group),
    religion: z.array(group),
    tier: z.array(group),
  }),
  trait: s,
});
export const RankingSchema = z.object({
  dimension: z.enum(dimensions),
  group: s,
  winner: s,
  order: strings,
  margin: num,
  why: s,
});
export const ResultSchema = z.object({
  run_id: s,
  campaign_id: s,
  seed: num.int(),
  depth: z.enum(["quick", "standard"]),
  status: z.enum(["running", "done", "failed"]),
  personas_total: num.int(),
  archetypes_total: num.int(),
  llm_calls: num.int(),
  cache_hits: num.int(),
  failures: num.int(),
  per_variant: z.array(PerVariantSchema),
  ranking: z.array(RankingSchema),
  overall: z.object({
    winner: s,
    margin: num,
    is_tie: z.boolean(),
    confidence: z.enum(["High", "Medium", "Low"]),
    regions_won: num.int(),
    recommended: s.nullable(),
    recommendation_note: s,
    robustness: RobustnessSchema,
  }),
  baseline: BaselineSchema,
  risk_flags: z.array(RiskFlagSchema),
  fixes: z.array(FixSchema),
  insights: strings,
  next_steps: strings,
  translations: z.array(z.object({ source: s, english: s })),
});
export const TranslationSchema = z.object({
  translations: z.array(z.object({ source: s, english: s })),
});
export const GuardrailSchema = z.object({
  decision: z.enum(["allowed", "blocked"]),
  reason: s,
});
export const RewriteSchema = z.object({
  headline: s,
  copy: s,
  visual_description: s,
  changes: strings,
  kept: strings,
  self_check_new_risks: strings,
});
export const RiskListSchema = z.object({
  flags: z.array(RiskFlagSchema).max(6),
});
export const BlurbsSchema = z.object({
  blurbs: z.array(z.object({ archetype_id: s, label: s, blurb: s })),
});
export const ExplainSchema = z.object({
  rows: z.array(z.object({ dimension: s, group: s, why: s })),
  insights: strings,
  next_steps: strings,
});
export type Campaign = z.infer<typeof CampaignSchema>;
export type Variant = z.infer<typeof VariantSchema>;
export type Reaction = z.infer<typeof ReactionSchema>;
export type Archetype = z.infer<typeof ArchetypeSchema>;
export type Result = z.infer<typeof ResultSchema>;
export type RiskFlag = z.infer<typeof RiskFlagSchema>;
export type Fix = z.infer<typeof FixSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type Event = {
  run_id: string;
  seq: number;
  time_ms: number;
  type: string;
  data: Record<string, unknown>;
};
export type PersonaTable = {
  count: number;
  longitude: number[];
  latitude: number[];
  archetype_index: number[];
  region: number[];
  platform: number[];
  [key: string]: unknown;
};
export type Audience = {
  audience_id: string;
  archetypes: Archetype[];
  personas: PersonaTable;
};
export const pretty = (s: string) =>
  ({
    jabodetabek: "Greater Jakarta",
    jawa_other: "Rest of Java",
    bali_nusa: "Bali & Nusa Tenggara",
    maluku_papua: "Maluku & Papua",
    islam: "Muslim",
    kristen: "Protestant",
    katolik: "Catholic",
  })[s] ?? s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
export const PersonaTableSchema = z.object({
  count: num.int().positive(),
  region: z.array(num.int()),
  city_tier: z.array(num.int()),
  age_band: z.array(num.int()),
  religion: z.array(num.int()),
  income_band: z.array(num.int()),
  platform: z.array(num.int()),
  language_style: z.array(num.int()),
  religiosity: z.array(prob),
  sensitivity: z.array(prob),
  virality: z.array(prob),
  longitude: z.array(num),
  latitude: z.array(num),
  archetype_index: z.array(num.int()),
  city: z.array(num.int()),
  lookups: z.object({
    region: strings,
    platform: strings,
    religion: strings,
    city_tier: strings,
    age_band: strings,
    cities: strings,
  }),
});
export const EdgeSchema = z.object({
  from: num.int(),
  to: num.int(),
  anger: z.boolean(),
});
export const OutcomeSchema = z.object({
  variant_id: s,
  exposed: z.array(z.number().int().min(0).max(1)),
  engaged: z.array(z.number().int().min(0).max(1)),
  objected: z.array(z.number().int().min(0).max(1)),
  sentiment: z.array(num.min(-1).max(1)),
  shared: z.array(z.number().int().min(0).max(1)),
  via_anger: z.array(z.number().int().min(0).max(1)),
  ticks: z.array(z.array(num.int())),
  edges: z.array(z.array(EdgeSchema)),
});
export const AudienceRequestSchema = z.object({
  campaign: CampaignSchema,
  depth: z.enum(["quick", "standard"]),
  seed: num.int(),
});
export const AudienceResponseSchema = z.object({
  audience_id: s,
  archetypes: z.array(ArchetypeSchema),
  personas: PersonaTableSchema,
});
export const SimulateRequestSchema = z.object({
  audience_id: s,
  seed: num.int().optional(),
  reactions: z.array(ReactionSchema),
});
export const SimulateResponseSchema = z.object({
  outcomes_handle: s,
  outcomes: z.array(OutcomeSchema),
});
export const AggregateRequestSchema = z.object({
  audience_id: s,
  outcomes_handle: s.optional(),
});
export const AggregateResponseSchema = ResultSchema.pick({
  per_variant: true,
  ranking: true,
  overall: true,
});
export const RobustnessRequestSchema = z.object({
  audience_id: s,
  reactions: z.array(ReactionSchema),
});
export const RobustnessResponseSchema = z.object({
  robustness: RobustnessSchema,
  confidence: z.enum(["High", "Medium", "Low"]),
  is_tie: z.boolean(),
});
export const RerunRequestSchema = z.object({
  audience_id: s,
  variant_id: s,
  method: z.enum(["rescored", "neutralized"]),
  reactions: z.array(ReactionSchema),
});
export const RerunResponseSchema = z.object({
  before: MetricsSchema,
  after: MetricsSchema,
  method: z.enum(["rescored", "neutralized"]),
  aggregate: AggregateResponseSchema,
  outcomes: z.array(OutcomeSchema),
});
export const ClarifyRequestSchema = z.object({
  campaign: CampaignSchema,
  answers: z.record(s, s).optional(),
});
export const StartResponseSchema = z.object({
  run_id: s,
  mock: z.boolean(),
  replay: z.boolean(),
});
export const FixRequestSchema = z.object({ flag_id: s });
export const EventSchema = z.object({
  run_id: s,
  seq: num.int().positive(),
  time_ms: num.min(0),
  type: z.enum([
    "stage",
    "brief",
    "audience",
    "reaction",
    "spread",
    "rollup",
    "robustness",
    "baseline",
    "risk",
    "fix",
    "done",
    "error",
  ]),
  data: z.record(s, z.unknown()),
});
