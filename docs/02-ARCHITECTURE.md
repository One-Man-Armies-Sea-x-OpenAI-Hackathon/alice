# 02. Architecture

## 1. Components
| Component | Tech | Responsibility |
|---|---|---|
| **Alice Web** (`apps/web`) | Next.js, TypeScript | UI, animation, and a thin server layer (BFF): SSE streaming to the browser, calls into the agent layer and the core. |
| **Alice Agents** (`packages/agents`) | TypeScript, OpenAI Agents SDK, Responses API | Every LLM interaction: guardrail, clarifier, persona blurbs, reaction fan-out, single-call baseline, risk analyst, rewrite, explainer, translation of shown text. Also the key pool, and the run workflow that coordinates agents and the core. |
| **Alice Core** (`services/core`) | Rust, async HTTP | Deterministic simulation: audience (archetypes, personas, geography, graph), diffusion, aggregation, scoring, ranking, Robustness check, confidence. Plus persistence endpoints (module `store`). Never calls an LLM. |
| **Postgres** | docker compose | Runs, results, LLM cache, demo recordings. |
| **Contracts** (`packages/contracts`) | JSON Schema, TS types | Source of truth for data shapes, also used as Structured Outputs schemas. |

## 2. Why this split
The engine is ours and fully deterministic, which makes the A/B comparison fair, runs reproducible and the "no external simulation engine" rule trivially true. LLMs do what they are good at: role-playing audience segments, judging cultural risk, writing rewrites and explanations. The split also lets four people work in parallel behind clear contracts.

## 3. Run workflow (one run)
1. **Input** arrives from the UI: brief text, variants, attachments, tool toggles, depth tier, mode.
2. **Guardrail** checks the brief for disallowed use. Blocked runs stop with an explanation.
3. **Attached text files** (if any) are already part of the brief text. There is no image analysis step (vision was cut on 6 Nov).
4. **Clarifier**: either asks up to three questions (the UI shows them and the run resumes with the answers) or reports ready. Produces the normalized Campaign.
5. **Audience**: the agent layer calls the core to build the audience for the tier and seed, passing the campaign's channels, target_regions and outdoor_regions for the placement gate. The core returns archetypes (with weights and persona counts), a compact persona table with map positions, and an `audience_id`. The graph stays server-side in the core.
6. **Persona blurbs**: one batched LLM call writes a short blurb per archetype (cached by archetype key).
7. **Reaction fan-out and baseline**: for each archetype and each variant, one structured-output call returns the reaction (see contracts). Concurrency-limited, cached by hash, retried, with a neutral fallback on failure. Progress events stream to the UI. In parallel, one single-call baseline answers the same brief with no segments (`prompts/runtime/single-call-baseline.md`).
8. **Simulate**: the agent layer posts the reactions to the core, which maps them to persona-level reactions, runs the diffusion for each variant with the same seed, and returns compact outcomes plus tick data for the animation.
9. **Aggregate and Robustness**: the core computes roll-ups for five dimensions, scores, ranking, margins, and the numeric drivers behind each ranking row. In compare mode, the agent layer then collects a second, uncached reaction set for the top scorer, and the core runs the Robustness check and sets confidence. Single mode skips this, because its confidence uses backlash only (`06-SIMULATION-SPEC.md` section 7).
10. **Explain and risk** (in parallel): the explainer writes the "why" sentences and insights from the numbers; the risk analyst receives per-segment metrics plus the top objecting comments and returns flags. One pass at every tier.
11. **Recommendation gate**: after the risk step, the agent layer sets the recommended variant. A variant with a high-severity flag cannot be recommended as is. If the top scorer is blocked, recommend the best unflagged variant. If every variant has a high flag, recommend none. The top scorer stays visible with a note.
12. **Fix loop** (if on): this runs by itself. For each high or medium flag: rewrite, self-check, re-score the affected archetypes plus a control sample, re-run with the same seed, then run the risk analyst on the rewrite. Stop when the flag clears or after two rounds. If a flag remains, set the status to needs_human and ask a person. Rewrites never replace the original variant without a person accepting them.
13. **Compare and translate**: the agent layer fills in what the baseline missed, then one batched call writes English lines for the text shown on screen.
14. **Persist and stream**: the final Result is stored; the UI receives a final event and opens the dashboard.

Steps 7 and 8 are the heavy ones. Nothing in steps 5, 8 and 9 touches the network except the call between the agent layer and the core, and the second reaction set in step 9.

## 4. Streaming to the browser
The BFF exposes one streaming endpoint per run (Server-Sent Events). Events (names fixed in `03-CONTRACTS.md`): stage started, brief parsed, audience ready, reaction received (carries archetype id, label, a comment and per-variant sentiment), spread tick (carries newly exposed persona indices and a capped list of edges), stage progress, roll-up ready, robustness ready, baseline ready, risk found, fix round finished, done, error. The UI animation is driven by these events with minimum display times (see `01-PRODUCT-SPEC.md` section 9). Cached replays emit the same events from a recording.

## 5. Data volume and wire format at up to 5,000 personas
- Never send one object per persona. Send **columns**: arrays of small integers for categorical fields (region index, age index, platform index, religion index, tier index, language index), arrays of rounded floats for longitude and latitude, and archetype index per persona. Gzip responses.
- Outcomes per variant: exposed flag, engaged flag, objected flag, sentiment (rounded) as columns, plus ticks as lists of newly exposed persona indices.
- Edges for the animation: capped per tick (for example 150) and sampled, not the whole graph.
- The UI pre-bakes static layers (land dots) once and draws personas in batches. Cap live arcs and visible cards.
- Result roll-ups are small. They are the same size at every tier.

## 6. Determinism and fairness
- One seed per run. Audience construction, graph, persona traits and per-persona noise are seeded; per-persona noise is seeded by seed and persona id so it is identical across variants.
- Only the variant's reaction differs between variants. That is what makes the comparison fair.
- The engine repeats exactly for the same reactions. A whole run repeats exactly only when its reactions come from the cache.

## 7. Persistence
Four Postgres tables (design in prompt `40-db-schema-crud`): runs (campaign document, config, status, timing), results (final Result document), llm_cache (hash, response, model, tokens), recordings (event timeline for replay). Reactions live in llm_cache. The chat list and messages live in the browser. Large persona tables are not stored long term; they can be regenerated from seed and tier. The core holds recent audiences in memory with a small cache.

## 8. Modes and flags
| Flag | Effect |
|---|---|
| `MOCK` | Agent layer returns fixture reactions, core still runs for real. A second level mocks the core too (static fixture result). |
| `DEMO_CACHE` | Runs for known demo briefs replay from recordings, no network. |
| `LLM_CONCURRENCY` | Upper bound for parallel LLM calls (set from the key's real rate limits). |
| `MAX_CALLS_PER_RUN` | Hard cap, defaults per tier. |

## 9. Performance targets (goals to measure and adjust, not promises)
| Tier | Core audience + simulate + aggregate | End to end, 3 variants |
|---|---|---|
| Quick (500) | under 0.3 s | about 25 s |
| Standard (1,500) | under 0.5 s | about 40 s |
| Deep (5,000, optional) | under 1.5 s | about 70 s |
Dominant cost is LLM latency. Browser stays above 30 frames per second at the highest tier built (5,000 agents at Deep) during the run view.
The end-to-end column was set before the noise floor and the fix loop existed. Both add LLM steps that run one after another, so expect longer runs. Nothing here is measured. Replace these numbers after the first real run. In a live demo, use Skip to open the dashboard while the fix loop finishes.

## 10. Failure handling
- LLM call fails: retry with backoff, then neutral fallback and count it. If more than a set share fail, stop the stage and surface a clear error with retry and "lower depth" options.
- A key's credit runs out: retry the same call on the next key in the pool (`04-OPENAI-USAGE.md` section 5). This does not count as a failure. If every key is out, stop with a clear message and offer the cached demo.
- Core unreachable: surface an error; offer replay of the cached demo if the brief matches.
- Browser disconnects or reloads mid run: the run continues server side and stores its final Result. There is no mid-run resume (cut on 6 Nov). On reload the UI shows "Run in progress" and polls `GET /api/runs/{id}` until the Result is ready, then opens the dashboard.
- Everything streams a final event, success or error, so the UI never hangs.

## 11. Security and privacy
Keys only on the server, on the presenting laptop, and each member provides their own key. The UI shows key position only, never the key. No real personal data is used or stored. Attached text files are read into the brief and go to the models only as part of it. Reactions are labeled synthetic everywhere in the UI.

## 12. Observability
Agents SDK tracing on for every LLM step (confirm how via the Docs MCP). Core logs timings per stage and tier. The run telemetry (calls, cache hits, failures, tokens, cost estimate) is stored with the run and shown in the QA view.
