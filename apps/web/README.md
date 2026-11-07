# Alice Web

Next.js App Router with a thin server BFF, SSE, browser-local chat history, and canvas/SVG visualizations. Run `npm run dev` from the repository root to load the existing workspace environment and start all services.

The supplied Alice logo is kept unchanged at `public/alice-logo.png` and used for the sidebar, welcome screen, assistant avatar and browser icon. Dark burgundy is the default; the cream theme uses the approved data ramps. Only Quick and Standard are displayed.

`components/Alice.tsx` handles composer, text attachments, clarification, sessions and the event-paced run view. `Dashboard.tsx` provides all six result tabs, translations, original-versus-rewrite comparisons and browser-print export. `Map.tsx` draws embedded Indonesian land dots and real simulation positions; no network is needed to draw a loaded replay.

Live events use minimum stage display times. Recorded replays retain their relative timing and are labeled. Skip and cancellation are available. Disconnected live streams fall back to result polling; opening a running saved conversation polls to completion.

Browser checks: `node scripts/browser-check.mjs` and `node scripts/flow-check.mjs` from the repository root, with the stack running. These test both themes, tabs, mobile overflow, a full submission and offline replay.
