# Alice Contracts

`src/index.ts` defines the shared validation schemas corresponding to `docs/03-CONTRACTS.md`. `npm run generate -w @alice/contracts` emits JSON Schemas into `schemas/` and TypeScript declarations into `src/generated.d.ts`. Runtime model responses are parsed again after Structured Outputs.

`src/demos.ts` holds the four synthetic campaign briefs. Offline results and recordings are in the root `recordings/` directory, with an explicit `mock` marker and no real user data.

Contract field names are fixed by the original spec. Changes require Fabian's approval. The implementation includes Quick and Standard; optional Deep is intentionally absent.
