# Alice

A pre-launch campaign rehearsal for Indonesian audiences. Compare 1–3 creative directions on the same synthetic audience, inspect the regional reaction map, review SARA and cultural risks, and see automatic rewrites tested again. Results are directional, never a forecast or real public opinion.

## Start

Requires Node 24+, Rust, and Docker for Postgres.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. This starts Postgres, applies the four-table migration, starts the Rust core on port 4000, and starts Next.js. The launcher reads `../.env` (the existing workspace keys), then an optional ignored checkout `.env`. Keys remain on the server. `OPENAI_API_KEY` accepts a single key or a comma/whitespace-separated ordered pool; `OPENAI_API_KEYS` also accepts a JSON array. Only key positions are exposed.

If Docker is unavailable, the launcher explicitly reports its durable local-file fallback. A configured but unreachable `DATABASE_URL` fails startup instead of silently losing persistence.

```sh
MOCK=1 npm run dev       # no model/network calls; real Rust simulation
DEMO_CACHE=1 npm run dev # recorded demo campaigns only, no model calls
```

The four checked-in demo recordings can be opened from the sidebar without the core, Postgres, or model network. Recordings retain whether they came from mock or live data. The UI always labels replays. Use Replay to view the original event timeline, or Skip to open the dashboard.

## Verification

```sh
npm test                  # agent policies and Rust invariants
npm run typecheck
npm run build             # schemas, production web build, release core
npm run smoke             # running web/core required; may make live calls
MOCK=1 npx tsx scripts/integration.ts
node scripts/browser-check.mjs
npm run prime             # real model calls; saves four offline recordings
```

The integration script verifies Quick/Standard flows, clarification, guardrails, persistent cache, and cascade deletion. Set `CORE_BASE_URL` to point it at a separate core. The browser check covers dashboard tabs, both themes and mobile overflow. See `docs/BUILD-REPORT.md` for measured results and remaining calibration work.

## Configuration

`REACTION_MODEL` / `ANALYSIS_MODEL` override the documented registry defaults. `LLM_CONCURRENCY` defaults to 8; set it to your account's limits. `MAX_CALLS_PER_RUN` defaults to 640 attempts, with a conservative pre-run reserve for two rewrite rounds. Rate limits back off on the same key. Only exhausted credit advances a running call to another key; invalid model access is checked separately at preflight. Retries count toward the cap. Cost and time estimates are planning estimates, not balance queries or guarantees.

`DATABASE_URL`, `CORE_BASE_URL`, `CORE_PORT` and `PORT` support a separate local instance. `NOISE_FLOOR_MIN` can raise the model-noise floor after calibration. `ALICE_DATA_DIR` chooses the explicitly reported local-file fallback directory.

## Structure

- `apps/web`: Next.js UI, canvas map and streaming BFF.
- `packages/agents`: OpenAI Responses and Agents SDK, orchestration, model pool, cache and budget.
- `packages/contracts`: schemas and generated types; field names follow `docs/03-CONTRACTS.md`.
- `services/core`: deterministic Rust audience, graph, diffusion, aggregation and robustness; no LLM calls.
- `db/migrations`: Postgres runs, results, llm_cache and recordings.
- `recordings`: portable demo results and ordered events, containing synthetic data only.
- `deck/index.html`: standalone pitch deck, arrow-key navigation.

Runtime prompts and product specs are retained. Planning packs, Codex task prompts, generated agent guidance, secrets and build output are ignored.
