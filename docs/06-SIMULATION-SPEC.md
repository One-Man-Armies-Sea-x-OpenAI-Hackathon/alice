# 06. Simulation spec (Alice Core)

Behavior of the Rust engine in plain language. Codex implements it; tests in the prompts check it. The engine never calls an LLM. In the UI the synthetic personas are called "agents" (same thing). Data tables are in `05-DATA-SPEC.md`; shapes in `03-CONTRACTS.md`.

## 1. Depth tiers (canonical)
| Tier | Personas | Archetypes | Reaction calls (3 variants) | Status |
|---|---|---|---|---|
| quick | 500 | 24 | 72 | required |
| standard | 1,500 | 48 | 144 | required |
| deep | 5,000 | 96 | 288 | optional, only if time remains |
Personas scale compute only. LLM cost scales with archetypes. Every tier runs one seed and a single risk review pass. Build quick and standard first. Deep is optional. Max (10,000 personas, three seeds) was cut on 6 Nov.

## 2. Building the audience
Input: tier, seed, campaign context. The audience is the same national sample for every campaign: channels and location do not change who exists, only who is exposed first (section 5). The core stores the campaign's channels, target_regions and outdoor_regions with the audience, for simulate, robustness and rerun.
1. **Sample personas.** For each persona: pick region by online weight; religion, city tier from the region's mixes; age band from the age mix; income from the tier; primary platform from the age band; language style from the age and platform rule; city by weight within the region; map position from dots near that city (jittered).
2. **Traits** (all seeded by seed and persona id):
   - religiosity: base by religion (islam 0.62, kristen 0.60, katolik 0.60, hindu 0.70, buddha 0.40, other 0.30), plus 0.10 for Sumatra, plus 0.10 for Hindus in Bali and Nusa Tenggara, plus a uniform spread of plus or minus 0.22, clamped to 0.05 to 1.
   - sensitivity: 0.30 plus 0.70 times a random value raised to the 0.8 power, plus 0.05 if aged 45+, clamped to 0.2 to 1.
   - virality: 0.25 plus 0.40 times a random value, plus 0.15 on TikTok or X, plus 0.10 if aged 18-24, clamped to 0.1 to 1.
3. **Derive archetypes.** Group the personas by a compound key (region, age band, platform, religion, city tier, language style) and merge groups into archetypes until the tier's archetype count is reached:
   - Reserve about a quarter of the slots for **coverage groups** first: every region at least once (twice for jabodetabek, jawa_other and sumatra from the deep tier up), every religion with a meaningful presence, every platform, every age band at least twice, every city tier. Minority groups matter because that is where cultural risk shows up.
   - Fill the remaining slots with the largest groups.
   - Assign leftover personas to the nearest archetype by weighted attribute distance (region 3, platform 2, age band 2, religion 2, city tier 1, language 1, income 1).
   - Each archetype's weight is its persona share, leftovers included. Its profile comes from the original group, before leftovers join, with a religiosity band from that group's mean (low under 0.45, mid up to 0.7, high above). Do not recompute the profile after leftovers join: they can outnumber a small coverage group, and its minority region or religion then disappears.
   - Coverage comes first, even if it takes more than a quarter of the slots at Quick.
4. Output: archetypes, the persona table (columnar) and an audience id. Keep the graph server-side.

## 3. Social graph
Each persona gets about 6 to 8 outgoing links. To avoid quadratic cost, sample about 40 candidates per persona: roughly 60 percent from the same region, 25 percent from the same platform anywhere, 15 percent anywhere. Score each candidate: +2 same region, +1.5 same platform, +1 same age band, +0.5 same religion, plus a random 0 to 1.2. Keep the top scorers. Then add reciprocal links while a persona's degree stays at or below 12. Everything is seeded.

## 4. From archetype reaction to persona reaction
Input: for every archetype and variant, the LLM reaction (attention, sentiment, share, click, backlash risk and category). For each persona (seeded noise by seed and persona id, **identical across variants**):
- **attention** = archetype attention plus uniform noise of plus or minus 0.10, clamped to 0.05 to 0.95.
- **sentiment** = archetype sentiment; if negative, multiply by (0.8 + 0.4 times sensitivity); then add uniform noise of plus or minus 0.14; clamp to -1 to 1.
- **backlash probability** = archetype backlash risk times (0.6 + 0.8 times sensitivity); if the category is religion related, also multiply by (0.5 + religiosity); clamp to 0 to 0.95.
- **share** = archetype share plus uniform noise of plus or minus 0.05, clamped to 0 to 0.9.
- **click** = archetype click plus noise of plus or minus 0.03, clamped to 0 to 0.6.

## 5. Diffusion (per variant, same seed)
Eight ticks after tick 0.
- **Tick 0:** each persona is exposed with probability attention times 0.62 times its **placement gate**. The gate is 1 if the campaign is actually placed in front of this persona, otherwise the off-target factor (0.10, in configuration). A persona is placed if (a) its platform is one of the campaign's online channels and its region is in target_regions (or target_regions is empty, meaning nationwide), or (b) the campaign has an outdoor channel and the persona's region is in outdoor_regions. If the campaign lists no channels or "Multiple channels", treat every platform as a channel. The off-target factor stands for seeing a repost or a screenshot somewhere else. The gate depends only on the persona and the campaign, never on the variant, so it is identical across variants and fairness holds.
- **Why the gate exists:** without it, a billboard at Bundaran HI reaches Papua at tick 0 as often as Jakarta, and a TikTok-only campaign reaches Facebook-only users at tick 0. With it, the spread starts where the campaign really runs and travels outward through sharing, which also gives the run animation its shape.
- **Objection, decided at exposure:** the moment a persona is exposed, it objects with probability equal to its backlash probability. Use a draw seeded by seed and persona id.
- **Each later tick:** every persona newly exposed in the previous tick shares with probability share times virality times 1.5. If the persona objects, multiply that by the anger boost (1.4). Cap at 0.95. A sharer exposes each unexposed neighbor with probability 0.50, plus 0.15 if they use the same platform, plus 0.3 times (neighbor attention minus 0.4); clamp to 0.05 to 0.9. Record newly exposed persona indices and a capped, sampled list of edges. Tag an edge as anger when the sharer objects.
- **Sentiment drift:** when a persona becomes exposed through a neighbor, its sentiment becomes 0.72 of its own plus 0.28 of the mean sentiment of its already exposed neighbors.
- **Anger hit:** a persona reached through an objecting sharer loses a further 0.10 sentiment at exposure (floor -1). Mark the persona as reached through anger.
- **Engagement:** an exposed persona is engaged if it shared, or with probability equal to its click value.

The anger boost and anger hit are design parameters, tunable in configuration. They let a bad variant go viral for the wrong reasons: wide reach with bad sentiment. A plain average of archetypes cannot show that. If anger spread is cut, set the boost to 1 and the hit to 0.

## 6. Metrics and score
For any group of personas (overall or a dimension group): reach = exposed share of the group; engagement = engaged share of the group; sentiment = mean sentiment over exposed personas (0 if none); backlash = objecting share of exposed personas; anger reach = share of exposed personas reached through anger.
**Score (0 to 100)** = 100 times the clamped sum of: 0.35 times (engagement times 3.2, capped at 1), plus 0.25 times reach, plus 0.25 times (sentiment plus 1) divided by 2, minus 0.35 times backlash, plus 0.10. Keep the weights in **one** configuration block.

## 7. Roll-ups, ranking, confidence
- Roll up metrics for five dimensions: region, age, platform, religion, city tier. Include group share of the audience.
- **Ranking** per group: order variants by score, winner, margin (winner minus runner-up in points). For the explainer, also return the **numeric drivers**: differences in sentiment, reach, engagement and backlash between winner and runner-up.
- **Overall:** winner by overall score and margin; count of regions won. The winner here is the top scorer only. The agent layer sets the recommended variant after the risk step: a variant with a high-severity flag cannot be recommended as is (see `02-ARCHITECTURE.md` section 3).
- **Robustness check (compare mode).** Three tests ask whether the winner holds up:
  1. **Noise floor.** The agent layer collects a second, uncached set of reactions for the top scorer. The core re-runs that variant with the same seed and audience. The gap between the two scores is the noise floor, with a minimum from configuration (default 1 point). At Checkpoint 2 the team replaces the default with a measured value: run the Langkah Run Standard compare run three times with noise sample numbers 2, 3 and 4, and set the minimum to the largest noise floor seen, rounded up to a whole point. This stops a single lucky re-ask from producing High confidence. A margin under the noise floor is called a tie.
  2. **Audience test.** Resample the archetypes with replacement 200 times, and recompute each variant's overall score from its archetype metrics. Count how often the winner stays on top. No LLM calls.
  3. **Constants test.** Re-run with each main engine constant moved up 20 percent and down 20 percent: tick 0 exposure (0.62), neighbor exposure (0.50), share multiplier (1.5), sentiment drift (0.28), and anger boost (1.4). That is 10 checks. Count how often the winner stays on top. No LLM calls.
  Report each test on its own (for example "Robustness: audience test 197 of 200 · constants test 10 of 10 · noise floor 2.3 points"). Never show one summed total such as "N of 210 checks": 200 of the 210 come from the audience test, and the constants test moves every variant alike, so it almost always passes. A summed total looks stronger than the evidence is. (checks_won and checks_total stay in the contract for logs, not for display.)
- **Confidence (compare mode):** High if the margin is at least twice the noise floor, the winner holds in at least 80 percent of the audience test, and it holds in every constants check; Medium if the margin is above the noise floor and the winner holds in at least 60 percent of the audience test; otherwise Low. These thresholds are design parameters, tunable in configuration. **Single mode:** High if overall backlash is under 8 percent, Medium under 18 percent, else Low.
- Groups under 3 percent of the audience are labeled noisy in the UI (under 1 percent at deep). Any group where fewer than 20 personas were exposed (n times reach) is labeled "few reached" in the UI and gets no winner chip, because targeting can leave whole regions almost unexposed.

## 8. Rerun with a fix
The agent layer asks the core to re-run one variant with the same seed and audience using new reactions to the rewrite. The new reactions must cover the affected archetypes and a control sample of unaffected archetypes (at least a quarter of them, chosen by seed), so people who liked the original can dislike the rewrite. Return before and after metrics and the method used.

Two methods exist. **Rescored** uses real new reactions and is the only method the UI may call verified. **Neutralized** zeros backlash from one category. It improves by design, so it is a what-if only. Label it "estimate, not verified".

A fix can lower the score. Show that honestly. Do not hide or retry a result because it got worse.

## 9. Determinism rules
Same seed, tier, campaign context and reactions must give byte-identical outputs. Random streams are derived from the seed plus a stable purpose label (audience, traits, graph, noise, diffusion, objection, robustness). Changing one variant's reaction must not change another variant's results.

This promise covers the engine. The LLM itself is not fully repeatable, so a whole run repeats exactly only when its reactions come from the cache. Say that plainly in docs and in the pitch.

## 10. Performance and size
Core audience plus simulate plus aggregate under 0.5 seconds at standard and under 1.5 seconds at deep (see `02-ARCHITECTURE.md` for the table). Use compact adjacency arrays and parallelism across variants. Responses use the columnar wire format and gzip. Memory for a 5,000 persona audience should stay in the tens of megabytes.

## 11. Tests Codex must write
1. Determinism: two identical calls match exactly.
2. Fairness: two variants given identical reactions produce identical outcomes; changing one variant leaves the other untouched.
3. Sums: archetype weights sum to 1; persona counts sum to N; group shares per dimension sum to 1.
4. Ranges: all probabilities and metrics stay inside their ranges; score within 0 to 100.
5. Coverage: every region and every religion in the coverage list appears in at least one archetype at every tier.
6. Monotonic sense: a variant with zero attention scores lowest; adding backlash lowers the score.
7. Scale: the highest tier built completes within the target; memory within bounds.
8. Distribution check: sampled region, religion, age and platform shares match the data tables within a small tolerance at standard tier and above.
9. Robustness: identical reactions give a noise floor equal to the configured minimum; a clear winner holds in most checks; a near tie does not reach High; the results repeat for the same seed.
10. Anger spread: raising backlash raises anger reach; with the boost at 1 and the hit at 0, anger reach has no effect on outcomes; objection draws are identical across variants.
11. Placement gate: with target_regions set to one region and no outdoor channel, tick-0 exposure outside it is about 10 percent of the rate inside it; with no channels and no regions the gate is 1 for everyone; an outdoor-only campaign exposes almost nobody outside outdoor_regions at tick 0; the gate is identical across variants.

## 12. Honesty
The engine turns language-model judgments about archetypes into population-scale numbers. It is directional. It does not know real people, and the pitch must say so.
