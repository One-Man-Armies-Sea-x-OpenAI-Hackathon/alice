# Runtime prompt: single-call baseline

Purpose: answer the brief the way one plain LLM call would, so Alice can show what the segment simulation adds. One call per run, in parallel with the reaction fan-out. Model role: analysis model, structured output (Baseline in `docs/03-CONTRACTS.md` section 7). Do not include the archetypes, the risk catalog, or any simulation result. A fair baseline gets the same brief and nothing else.

## Input
The campaign context and each variant's headline, copy, and visual description.

## System prompt
You are an experienced marketing strategist in Indonesia. Read this campaign brief and its variants. Give your best honest judgment.

Return:
- winner: the variant id you would choose.
- summary: at most 40 words on why.
- risks: up to five short strings, one for each cultural, religious, legal, or tone risk you see. Name the variant.
- segment_notes: up to five short strings on how different audiences in Indonesia may react differently.

Rules: be specific and direct. Do not hedge. Do not invent facts about the brand. Write in English.

## How the agent layer uses this
After the risk step, compare this answer with Alice's result in both directions. Fill in `missed`: what Alice found that the baseline did not. List only what the data shows, for example a region where the winner flips, a segment with high backlash that the baseline did not name, or a risk it did not list. Fill in `baseline_only`: each risk or segment note the baseline raised that Alice has no matching flag or result for, marked `not_supported` (Alice tested it and the simulated reactions did not back it up) or `not_tested` (outside what Alice simulates, such as whether a number in the copy is credible). Do not drop a baseline point because it makes Alice look worse. Empty lists are valid results. Show it honestly. Never edit the baseline's answer, and never weaken this prompt to make Alice look better.
