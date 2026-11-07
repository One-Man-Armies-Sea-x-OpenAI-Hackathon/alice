# 04. OpenAI usage and the MCP-first rule

Alice lives inside the OpenAI ecosystem: the build uses Codex with the OpenAI developer documentation MCP, and the product uses OpenAI APIs for every model call.

## 1. MCP first
- Server: OpenAI developer docs MCP, read-only, streamable HTTP at `https://developers.openai.com/mcp`. Registered in Codex under the name `openaiDeveloperDocs` (commands in `prompts/codex/00-setup-and-mcp.md`). It covers developers.openai.com, platform.openai.com and learn.chatgpt.com. It only reads docs; it does not call the API for you.
- Rule: for **any** detail about OpenAI APIs, SDKs, models, tools, limits or pricing, search and read the docs through the MCP first. Do not rely on memory. Model names, parameter names and even SDK shapes change.
- Starting points the docs navigation lists (search for them by name): the latest-model guide, model selection, Responses API, Structured Outputs, Streaming, Agents SDK (overview, define agents, running agents, orchestration, guardrails, results, integrations and tracing), MCP servers and connectors, web search, Moderation, prompt caching, Batch, Flex processing, latency optimization, rate limits, spend limits and error codes. Note the docs also describe a hosted Agents API; this project uses the **Agents SDK** in our own TypeScript layer for full control. Check the docs to confirm that choice still fits.

## 2. Where OpenAI is used
| Feature | OpenAI capability | Notes |
|---|---|---|
| Reaction fan-out (the heavy one) | Responses API with Structured Outputs on a fast, low-cost model | One call per archetype and variant. Stable instructions and few-shot examples first, variable data last, to benefit from prompt caching. Concurrency-limited. |
| Single-call baseline | Structured output on the analysis model | One call per run: the same brief with no segments. Shown beside Alice's result. |
| Noise floor | Same reaction call, cache bypassed | A second reaction set for the top scorer only, so the Robustness check can measure LLM noise. |
| Translation of shown text | Structured output, batched | One call per run writes English lines for text shown on screen. Reactions stay in Indonesian. |
| Clarifier | Agents SDK agent with a structured output | Max three questions. |
| Persona blurbs | Structured output, batched | One call writes all blurbs. |
| Risk analyst | Agents SDK agent on a stronger model | Grounded in simulated comments and metrics plus the catalog in `07-RISK-AND-CULTURE.md`. |
| Rewrite agent | Agents SDK agent with a self-check | Runs in the automatic fix loop, up to two rounds per flag. Drafts the fix and checks it for new risks. |
| Explainer | Structured output | Writes "why" sentences and insights from numeric drivers only. |
| Guardrail | Agents SDK input guardrail, optionally with the Moderation endpoint as a first pass | Blocks hateful, violent or harassing content aimed at groups. |
| Tracing | Agents SDK tracing | On for every LLM step. |
| Streaming | Streaming events | For clarifier typing effects. |

## 3. Model registry
Never hard-code model names in logic. Keep a small configuration with two roles and set each from the docs at build time:
- **reaction model**: fastest, cheapest model that passes the quality bar below. Used for hundreds of calls.
- **analysis model**: stronger model for risk, rewrite, explainer, clarifier.
Document the chosen model and the date you chose it in the registry file's comments.

## 4. Quality bar for the reaction model (do this in prompt 22)
Run the same 10 archetypes on the demo brief with two or three candidate models. Pass if: outputs always validate against the schema; sentiment and backlash differ meaningfully between variants and between archetypes; known risky variants produce high backlash for the right segments and not for others; comments read as natural Indonesian in the right register; latency fits the tier targets. Pick the cheapest that passes. Record the comparison in the repo.

## 5. Budget and rate-limit policy
- Calls per run = archetypes x variants + archetypes for one variant (noise floor) + about 8 to 14 others. Compute and show the estimate before running.
- Cache every call by a hash of (prompt version, model, inputs, sample number). The noise floor uses sample number 2 so it does not hit the first cached reaction. Never put the key in the hash. The demo briefs must run fully from cache.
- Set `LLM_CONCURRENCY` from the real rate limits (look them up in the docs and in the key's limits page). Back off on rate-limit errors with jitter. Use the error code guidance from the docs.
- Respect `MAX_CALLS_PER_RUN` per tier. When the cap would be exceeded, reduce archetypes first, then stop with a clear message.
- Set a spend limit on each key if the organizers allow it.
- For non-interactive precomputation (priming demo caches), consider cheaper processing modes the docs describe, but only if they do not slow the live path.

**Key pool.** Each of the four members has a 100 USD API key, 400 USD in total (confirmed by the team on 6 Nov). Confirm at the 09.00 briefing that one app may use all four keys. All of this lives in `packages/agents`:
- One ordered list of keys in a server-side environment variable. Each member provides their own key, on the presenting laptop only. The chosen demo key goes last.
- Move to the next key only when the error says the credit is used up. A rate-limit error stays on the same key and backs off. Never use the pool to get around a rate limit. Confirm the exact error codes through the MCP, because the two can look alike.
- At startup, send one tiny call per key. Skip any key that cannot use the registry's models, and show which position was skipped. Never swap to a different model, because every variant in a run must use the same model to stay fair.
- Retry the failed call on the new key, so a run does not lose a reaction or count a false failure.
- Track estimated spend per key and for the pool. Check through the MCP whether a remaining balance can be read. If not, use our own estimate and say it is an estimate. Show the pool total in the pre-run estimate. Show key position only, never the key.
- Warn when the pool reaches the demo key, so credit remains for judging.
- If every key is out, stop with a clear message and offer the cached demo.
- Prompt caching may not carry across keys. Confirm through the MCP, and expect slower or costlier calls right after a move.
- The number of runs the pool buys is not measured. Set the caps at 11.30 from the first real run.

## 6. Structured Outputs notes
Schemas must be accepted by the Structured Outputs feature as documented (required fields, allowed types, enum handling, nesting limits). Confirm exact restrictions in the docs before generating schemas. Keep schemas flat where possible. Always validate responses again on our side, clamp numeric ranges, and treat refusals and truncation as failures to retry.

## 7. Lookup checklist (answer from the MCP before coding each area)
1. Current model IDs and which to use for reaction and analysis, with context and price notes.
2. How to call the Responses API with a structured output schema, and the schema restrictions.
3. Agents SDK for TypeScript: package name, how to define an agent, how to run it, how to stream, how to add input guardrails, how to enable tracing, how to attach MCP servers, how to run agents in parallel.
4. How to tell a rate-limit error from a used-up credit error, and whether a key's remaining balance can be read.
5. Rate limits, spend limits, retry guidance and error codes.
6. Prompt caching conditions (prefix rules) so the prompt layout is cache-friendly.
7. Moderation endpoint usage (for the guardrail first pass).

## 8. Compliance with the hackathon rule
All model calls go to OpenAI. The simulation engine is our Rust code. No other model vendor and no external simulation engine is used.
