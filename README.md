# Alice

A pre-launch campaign rehearsal for Indonesian audiences. Compare 1–3 creative directions on the same synthetic audience, inspect the regional reaction map, review SARA and cultural risks, and see automatic rewrites tested again. Results are directional, never a forecast or real public opinion.

## Start

Requires Node 24+, Rust, and Docker for Postgres.

```sh
npm install
npm run dev
```

For an optimized serving build, run `npm run build` and then `npm start`. Production output uses `.next-production`, separate from development assets, so a build can run without clearing the live development cache. `npm run dev` keeps hot reload enabled while editing.

Open http://127.0.0.1:3000 and create an account. This starts Postgres, applies the migrations, starts the Rust core on port 4000, and starts Next.js. The launcher reads `../.env` (the existing workspace keys), then an optional ignored checkout `.env`. Keys remain on the server. `OPENAI_API_KEY` accepts a single key or a comma/whitespace-separated ordered pool; `OPENAI_API_KEYS` also accepts a JSON array. Only key positions are exposed.

If Docker is unavailable, the launcher explicitly reports its durable local-file fallback. A configured but unreachable `DATABASE_URL` fails startup instead of silently losing persistence.

```sh
MOCK=1 npm run dev       # no model/network calls; real Rust simulation
DEMO_CACHE=1 npm run dev # recorded demo campaigns only, no model calls
```

Accounts have private server-backed conversations, saved results, and revisable dashboard artifacts. Register, log in, change your password, or delete your account through the interface. No demo chats are seeded. Legacy fictional recordings remain available for development; they are not assigned to new accounts.

For a phone on the same Wi-Fi, open `http://<laptop-LAN-IP>:3000`. The web server binds to the LAN; the Rust core remains loopback-only and accepts the launcher's internal token. Use HTTPS for a public production deployment.

## Verification

```sh
npm test                  # agent policies and Rust invariants
npm run typecheck
npm run build             # schemas, production web build, release core
npm run smoke             # auth + artifact integration; requires a MOCK=1 stack
node scripts/frontend-regressions.mjs
node scripts/settings-reference-qa.mjs
node scripts/background-campaign-qa.mjs
npm run prime             # optional: substantial real model usage at individual scale
```

The account-aware smoke script checks 500 individual mock reactions, cross-account isolation, password rotation, deletion, conversation/chart persistence, calendar scenarios, mobile layout and scroll restoration. It refuses to start on a live-model server. Set `WEB_BASE_URL` for a separate mock instance. The frontend regression check covers the status dots and prompt clearing. See `docs/12-CONVERSATIONAL-REVISION.md` for the current revision; `docs/BUILD-REPORT.md` retains the original grouped-model measurements.

Browser regression scripts default to an isolated mock web server on port 3001. Direct core scripts such as `prime` require `CORE_BASE_URL` and `CORE_INTERNAL_TOKEN` to match the running core; configure a shared token in the ignored environment file when using them.

## Configuration

`REACTION_MODEL` / `ANALYSIS_MODEL` override the documented registry defaults: GPT-5.6 Luna for individual reactions, GPT-4.1 for analysis. Each of the 500 Quick / 1,500 Standard people receives a separate reaction per variant. `LLM_CONCURRENCY` defaults to 8; set it to your account's limits. `MAX_CALLS_PER_RUN` defaults to 16,000 attempts, with a conservative pre-run reserve for two rewrite rounds. Rate limits back off on the same key. Only exhausted credit advances a running call to another key; invalid model access is checked separately at preflight. Retries count toward the cap. Cost and time estimates are planning estimates, not balance queries or guarantees.

`DATABASE_URL`, `CORE_BASE_URL`, `CORE_PORT` and `PORT` support a separate local instance. `NOISE_FLOOR_MIN` can raise the model-noise floor after calibration. `ALICE_DATA_DIR` chooses the explicitly reported local-file fallback directory.

## Structure

- `apps/web`: Next.js UI, canvas map and streaming BFF.
- `packages/agents`: OpenAI Responses and Agents SDK, orchestration, model pool, cache and budget.
- `packages/contracts`: schemas and generated types; field names follow `docs/03-CONTRACTS.md`.
- `services/core`: deterministic Rust audience, graph, diffusion, aggregation and robustness; no LLM calls.
- `db/migrations`: Postgres runs, results, llm_cache, recordings, users, sessions and conversations.
- `recordings`: portable demo results and ordered events, containing synthetic data only.
- `deck/index.html`: standalone pitch deck, arrow-key navigation.

Runtime prompts and product specs are retained. Planning packs, Codex task prompts, generated agent guidance, secrets and build output are ignored.

One chat represents one campaign. Its creative mode is Single direction or Multiple directions. Supporting message means the offer, benefit or call to action under a headline; Visual reference or scene can be described directly or supplied as a PNG/JPEG/WebP under 3 MB. Images are read once into a description instead of sent again to every person. Settings store per-account appearance, name, default depth/mode and tool preferences, and show real provider/storage status and usage limits.
