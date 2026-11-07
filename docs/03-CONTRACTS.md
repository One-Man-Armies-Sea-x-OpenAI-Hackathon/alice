# 03. Contracts

Codex turns these tables into JSON Schemas in `packages/contracts` (also used as Structured Outputs schemas where marked) and mirrors them in Rust. Field names are fixed. Changes need Fabian's approval and a message to the team. All ranges are inclusive.

**6 Nov scope cut (team decision; Fabian confirms before running `02`):** removed the max tier, creative vision (CreativeNote, creative_notes, tools.vision), seed_range and seed_stability, and stream resume. **Added:** Baseline.baseline_only (the two-way comparison), Campaign.target_regions and Campaign.outdoor_regions, plus the same two fields in the clarifier's extracted object (placement gate, `06-SIMULATION-SPEC.md` section 5). No other field changed.

## 1. Enumerations
| Name | Values |
|---|---|
| region | jabodetabek, jawa_other, sumatra, kalimantan, sulawesi, bali_nusa, maluku_papua |
| city_tier | metro, tier2, tier3 |
| age_band | 18-24, 25-34, 35-44, 45+ |
| religion | islam, kristen, katolik, hindu, buddha, other |
| income_band | low, mid, high |
| platform | tiktok, instagram, youtube, facebook, x, whatsapp |
| language_style | slang, casual, formal |
| campaign_type | business, activist, political |
| backlash_category | none, sara_religion, sara_ethnicity, sara_class, local_norms, language_tone, political, copycat_legal, other |
| severity | high, medium, low |
| depth_tier | quick, standard, deep (deep is optional) |
| dimension | region, age, platform, religion, tier |

## 2. Campaign (input after clarifying)
| Field | Type | Notes |
|---|---|---|
| id | string | |
| campaign_type | campaign_type | |
| brand | string | |
| product | string | |
| objective | string | awareness, launch, promo or cause |
| channels | list of (platform or outdoor) | |
| location | string | free text plus resolved region if any |
| target_regions | list of region | where online placements run; empty means nationwide. Set by the clarifier |
| outdoor_regions | list of region | where outdoor placements are; empty if there is no outdoor channel. Set by the clarifier |
| timing | string | season or moment, or none |
| notes | string | |
| variants | list of one or more Variant; no fixed planning count; model-call cap applies to each simulation | |
| tools | object | risk, calendar, rewrite booleans |
| depth | depth_tier | |
| seed | integer | default 42 |

**7 Nov approved contract update:** the user explicitly approved overriding the Fabian-approval restriction for dynamic direction IDs and removal of the three-direction limit. Existing A/B/C documents remain valid.

**Variant:** id (stable uppercase letters: A…Z, AA, AB, and so on), label, headline, copy, visual_description, attachment_ids (list), ai_drafted (boolean).

## 3. Clarifier output (Structured Outputs)
| Field | Type | Notes |
|---|---|---|
| ready | boolean | |
| questions | list of up to 3 Question | empty if ready |
| extracted | object | brand, product, campaign_type, channels, location, target_regions, outdoor_regions, timing, variants (normalized), detected_missing (list) |
Question: id, text, options (list of short strings), allows_free_text (boolean).

## 4. Segment, archetype, persona
**Segment** (a cell of the audience): region, city_tier, age_band, religion, income_band, platform, language_style, religiosity_band (low, mid, high).
**Archetype:** id, segment, weight (share of the online audience, sums to 1), persona_count, blurb, label (short human label).
**Persona table (columnar, per audience):** count N; columns region, city_tier, age_band, religion, income_band, platform, language_style as small integers with a lookup list; religiosity, sensitivity, virality as rounded floats; longitude and latitude (rounded to 2 decimals); archetype_index; city name index.

## 5. Reaction (LLM output, Structured Outputs; one per archetype and variant)
| Field | Type | Range or notes |
|---|---|---|
| archetype_id | string | echoed back |
| variant_id | string | echoed back |
| attention | number | 0 to 1: chance they stop and look |
| sentiment | number | -1 to 1 |
| share_likelihood | number | 0 to 1 |
| click_likelihood | number | 0 to 1 |
| backlash_risk | number | 0 to 1: chance they publicly object |
| backlash_category | backlash_category | none if backlash_risk is low |
| reason | string | at most 200 characters, Indonesian, in the persona's register |
| sample_comment | string | at most 120 characters, Indonesian, in the persona's voice |

## 6. Simulation outcome (core output, per variant)
Columns over personas: exposed, engaged, objected (0 or 1), sentiment (rounded float), shared (0 or 1), via_anger (0 or 1). Plus **ticks** (tick 0 to 8, each a list of newly exposed persona indices) and **edges** (per tick, capped sampled pairs of persona indices, each with an anger flag).

## 7. Roll-ups and result
**Metrics (per variant and group):** n, reach, engagement, sentiment, backlash, anger_reach, score (0 to 100). Definitions are in `06-SIMULATION-SPEC.md`.
**Result:**
| Field | Notes |
|---|---|
| run_id, campaign_id, seed, depth, status | status: running, done, failed |
| personas_total, archetypes_total, llm_calls, cache_hits, failures | telemetry |
| per_variant | list: variant_id, label, overall metrics, by_dimension (for each dimension, per group metrics), trait (short phrase) |
| ranking | per dimension and group: winner, order, margin, why (written by the explainer) |
| overall | winner (top scorer), margin, is_tie, confidence (High, Medium, Low), regions_won, recommended (variant id, or none if no variant can be recommended), recommendation_note (why the top scorer is not recommended, when that is the case), robustness |
| baseline | Baseline, the single-call answer |
| risk_flags | list of RiskFlag |
| fixes | list of Fix |
| insights | 3 to 4 short strings; next_steps list |
| translations | list of source and english pairs, for the text shown on screen |
**Robustness:** noise_floor (points), checks_won, checks_total, audience_won, audience_total, constants_won, constants_total.
**Baseline (Structured Outputs):** winner (variant id), summary, risks (list of short strings), segment_notes (list of short strings), missed (list of what Alice found and the single call did not, filled in by the agent layer), baseline_only (list of items, each with text and status: not_supported when Alice tested it and the simulated reactions did not back it up, or not_tested when it is outside what Alice simulates, for example a claim's credibility; filled in by the agent layer). Only winner, summary, risks and segment_notes are in the model's output schema; missed and baseline_only are added afterwards.
**RiskFlag:** id, variant_id, severity, category, title, explanation, segments (list of group keys with backlash rate), map_region, evidence (comment text, persona tags), suggested_fix_direction, rule_id (catalog id or "novel").
**Fix:** flag_id, variant_id, original (headline, copy, visual), rewrite (headline, copy, visual), changes (list), self_check_new_risks (list, should be empty), rounds (1 or 2), status (cleared, needs_human), rerun (optional: before and after metrics, method rescored or neutralized, archetypes_rescored, control_archetypes).

## 8. Core HTTP API (base path `/v1`)
| Method and path | Purpose |
|---|---|
| POST /v1/audience | Input: campaign context (including channels, target_regions and outdoor_regions, stored with the audience), depth, seed. Output: audience_id, archetypes, persona table. |
| POST /v1/simulate | Input: audience_id, seed, reactions for each archetype and variant. Output: outcomes with ticks per variant. |
| POST /v1/aggregate | Input: audience_id, outcomes handle. Output: roll-ups, ranking data (including numeric drivers), overall winner, confidence. |
| POST /v1/robustness | Input: audience_id, outcomes handle, second reaction set for the top scorer. Output: Robustness and the updated confidence. |
| POST /v1/rerun | Input: audience_id, variant_id, method, new reactions or a category to neutralize. Output: before and after metrics, same seed, plus per-segment metrics and top objecting personas for the rewrite, so the risk analyst can check it. |
| GET /v1/health | ok |
Persistence endpoints (module `store`): CRUD for runs, results, llm_cache and recordings (spec in prompt `40`).

## 9. BFF API (apps/web server routes)
| Route | Purpose |
|---|---|
| POST /api/clarify | Run the guardrail and clarifier. Returns questions or ready plus the normalized Campaign. |
| POST /api/runs | Start a run from a Campaign. Returns run_id. |
| GET /api/runs/{id}/stream | Server-Sent Events for a run. |
| GET /api/runs/{id} | Current or final Result. |
| POST /api/runs/{id}/fix | Run the fix loop again for one flag, on demand. |
| GET /api/demo/{name} | Cached demo result and recording. |
The chat list and messages live in the browser. They are not stored on the server.

## 10. SSE event names and payloads
stage (id, index, total), brief (variants, channels, location, timing, files), audience (personas, archetypes, per-region counts), reaction (archetype id, label, count, comment, mean sentiment per variant, running count), spread (variant id, tick, newly exposed indices, edges with anger flag, share reached, objected count), rollup (overall and per-region metrics), robustness (Robustness), baseline (Baseline), risk (flag), fix (flag id, round, status, change summary), done (result id), error (stage, message, retryable).
Every event carries run_id and a monotonically increasing sequence number so replay works and the client can order events. There is no resume from a sequence number (cut on 6 Nov).

## 11. Environment variables
Names only (values are secrets): an ordered list of OpenAI API keys (the demo key last); model registry entries for the reaction and analysis models; `LLM_CONCURRENCY`; `MAX_CALLS_PER_RUN`; `MOCK`; `DEMO_CACHE`; database URL; core base URL.
