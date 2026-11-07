# Build report — 7 November 2026

Implemented across all four ownership areas under the user's explicit sole-developer instruction. The original field names and product specs were retained. Planning packs and local agent instructions are ignored in Git.

## Verified

- 5 TypeScript policy tests and 9 Rust tests pass: budget caps, credit/rate distinction, recommendation gating, demo validation, deterministic sampling, fairness/isolation, ranges and sums, placement, distributions, robustness, HTTP rejection, durable reopen and cascade deletion.
- Quick and Standard complete end to end in mock mode against the Postgres-backed core; results validate against the shared schema. Measured direct workflow time: about 210 ms / 301 ms before UI pacing on this laptop.
- Four real demo flows have been recorded. The first live Langkah Run Quick run completed in 79.9 s with 129 calls and zero reaction failures. A and B were within the measured model noise floor, so the dashboard reported Low confidence and “Too close to call.”
- Live Langkah Run Standard completed in 147.1 s, including initial key probes, with 1,500 agents, 249 run calls, zero reaction failures, Medium confidence, and one high-severity flag on C.
- Repeating the live Quick brief through the HTTP BFF completed with 129 cache hits and zero new model calls. An SSE client disconnected after reaction delivery; the server still finished and returned its stored result.
- The live flag-print fix cleared in the analyst rerun while its score decreased. The UI preserves this tradeoff and the original creative.
- Postgres integration checked run/result/recording writes, cache read/write, and cascade deletion. Four tables only.
- Browser automation exercised every dashboard tab, both themes and a 390px-wide viewport: no page errors or horizontal overflow. A full composer-to-dashboard submission and a loaded replay with browser networking disabled also passed.
- Production Next.js build and Rust release build pass. JSON schemas and TypeScript declarations regenerate successfully.

## Fixes caught during integration

- The API requires at least 16 output tokens for the tiny startup probe; corrected from 8 after an actual validation error and MCP endpoint inspection.
- A multi-key environment value was being treated as one tracing-export key by the SDK defaults. The exporter is now explicitly given the selected key only. No raw key was printed or persisted.
- Unsupported numbers in an explainer response now trigger one retry; invalid prose is rejected without discarding the numerical simulation.
- Replay map geometry is embedded, so remounting the canvas does not require a network request.

## Deliberate scope and remaining calibration

Quick and Standard are built. Deep is omitted. `MOCK=1` uses deterministic synthetic judgments and labels all output mock. Checked-in primary recordings now come from real model runs; recordings identify their origin. Optional default-model quality comparisons and three-sample noise-floor calibration have not been run; confidence therefore retains the conservative per-run measured noise floor and configured minimum. These results are not calibrated to real campaign outcomes.

Cost estimates are planning estimates using the documented default-model rates; remaining credit is not queried. Model overrides need corresponding estimate calibration. Live runs exceeded the original speculative 25/40-second targets; actual measurements above take precedence. No public-facing hosting was configured: this is the requested local Next.js/Rust/Postgres repository.

The supplied logo is used unchanged. Finer audience distributions remain the provided calibrated estimates. Very rare religions absent from a random sample are not artificially invented; archetype coverage preserves every religion present in that sample.
