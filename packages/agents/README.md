# Alice Agents

Server-only model layer. `foundation` exports `structured`, `Budget`, `estimate`, `preflight`, `poolStatus`, `core`, and the persistent store client. `intake` exports guardrail and clarification. `explain` supplies grounded explanations and English lines. `workflow` coordinates runs and records monotonically ordered events.

The model registry is in `src/foundation/index.ts`; roles are overridden by environment variables. Exact SDK and Responses shapes were checked through the OpenAI Docs MCP before implementation, with source links in code. Reaction calls always use the same role across variants. Mock responses have separate cache identities from live responses.

Credit exhaustion alone advances an active call to another key. Rate and spend limits never move it. Preflight separately skips keys with unavailable models or invalid authentication. Attempts count against a hard per-run cap; cache hits do not. Startup probes are separate from run telemetry. Cost is an estimate using the documented default model rates; model overrides require updating estimates. A fatal failure stops the run; failed reaction calls can use neutral fallbacks up to a failure threshold.

Rewrites rescore every archetype, including unaffected controls where present. They do not change originals. Mock reruns are never called verified. Both directions of the baseline comparison are preserved.

The November revision uses GPT-5.6 Luna with reasoning effort none for individual reaction calls. Individual profiles have persona_count=1; the legacy archetype identifiers remain wire-compatible. Cache keys include account and reasoning configuration. `artifact` owns persisted discussion and constrained chart/scenario changes. `effectiveness` identifies repeated low-interest feedback about vague benefits so the fix loop can address effectiveness as well as cultural risk.
