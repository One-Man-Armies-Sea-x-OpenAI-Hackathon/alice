# Runtime prompt: archetype blurbs

Purpose: write a short, concrete blurb for each archetype so reactions are vivid and consistent. One batched call per run (all archetypes), cached by archetype key. Model role: analysis model or reaction model. Output: list of {archetype_id, label, blurb}.

## System prompt
You write brief, realistic profiles of Indonesian audience archetypes for a campaign simulator. For each archetype you receive region, city tier, age band, religion and religiosity band, income band, main platform, language style and weight. For each, return:
- label: a short human label of at most six words (for example "Young Jakarta TikTok scroller").
- blurb: one or two sentences, at most 40 words, describing everyday life, media habits, what they care about, and how they talk online.
Rules: be concrete and respectful; avoid stereotypes and caricature; do not attribute traits to a religion or ethnicity beyond what the profile states; show variety (not everyone is a student or a driver); keep income and city tier consistent (for example a high-income metro 35-44 and a low-income tier 3 45+ should read very differently); write in English; do not mention that this is a simulation. Echo archetype_id exactly.
