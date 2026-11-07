# Alice Core

Rust owns audience generation, graph construction, diffusion, metrics, ranking and robustness. There are no model calls or external social simulation libraries. Sampling tables are in `src/config.rs`, city coordinates in `cities.json`, and the shared Natural Earth land dots in `land.json` (public-domain 110m country boundaries).

The fixed SplitMix64 arithmetic derives randomness from seed, persona and purpose. Variant IDs never enter the draw streams. The columnar HTTP API is under `/v1`, with request checks and gzip compression. Recent audience/outcome state is bounded to 32 audiences.

`cargo test` checks deterministic audience generation, identical-variant fairness and isolation, ranges and sums, placement, distributions, near-tie robustness, persistent cache reopen, HTTP rejection and cascading deletion.

`store` applies `db/migrations/001_initial.sql` at startup when `DATABASE_URL` is present. It keeps exactly four tables. Without a database URL it explicitly reports its durable local-file fallback. The launcher configures Postgres automatically when Docker is running.
