# Conversational workspace revision — 7 November 2026

This revision follows the team's explicit feedback and replaces the earlier no-login, three-question-total, grouped-reaction design. The existing Campaign/Reaction/Result field names are unchanged; new account and artifact data use separate endpoints and documents.

## Accounts and private history

Registration, login, logout, current-password-confirmed password change, and password-confirmed account deletion are implemented. Passwords use salted scrypt hashes and constant-time comparison. Opaque sessions are stored hashed and issued through HttpOnly/SameSite cookies; production cookies are Secure. Password rotation invalidates other sessions. All model/run/conversation routes check the current account and ownership before returning data. A browser-provided run ID does not grant access.

Postgres now has seven tables: the original four, plus users, sessions and conversations. Account deletion removes owned runs/results/recordings, account-scoped model cache, sessions and conversation history. The core remains loopback-only and the launcher supplies an internal token to the BFF and core. Old unowned recordings are not assigned to a new user automatically. Default demo conversations are removed.

An exploration account was created on the presenting laptop; its credentials are outside Git. Accounts are local to the running database. Email verification and email-based forgotten-password recovery are not implemented; the requested password-change flow requires the current password.

## Individual reactions

The default persona model is gpt-5.6-luna, verified against the OpenAI Docs MCP and by a small successful live request. Direct persona calls use reasoning effort none, which this model supports. Analysis remains independently configured. Every one of the 500 Quick / 1,500 Standard people gets a unique deterministic personality profile and a separate model reaction per variant. Original archetype field names are retained internally for compatibility, but individual profiles have persona_count = 1.

Per-run call estimates now scale with individual people, including noise checks and rewrite reruns. The hard default cap is 16,000 model attempts. This is materially more expensive and slower than 24/48 grouped calls. Full-scale live latency has not yet been benchmarked. Cache identities include the account, model and reasoning configuration. Old grouped recordings are labeled as earlier grouped simulations.

## Conversation and artifacts

Dashboard questions can add constrained charts from existing metrics, change explicit calendar assumptions, or prepare a revised campaign draft. A changed campaign requires a new run before numbers change. Conversations, chart definitions, scenario assumptions and artifact revision numbers persist with the owned run. The new account conversation list is server-backed rather than shared localStorage.

Clarification is model-directed, up to three focused questions per turn, with additional turns where important context remains missing. Sending a brief clears the separate draft input immediately and keeps the brief in chat and in campaign context. Conversation rows open at the top. Status dots use scoped styles to prevent a loading-state padding collision.

## Geographic graph and calendar scenario

Agents remain at their sampled longitude/latitude. Live reactions reveal decisions individually; sampled social links and actual sampled spread transmissions connect geographic nodes. Users can select a person during processing or in the finished network to see supplied personality, returned reaction metrics/comment, and recorded engine outcome. Model private reasoning is not exposed. Links are explicitly labeled as samples rather than a complete graph.

Calendar time is a distinct Rust scenario calculation. Users set a start date, duration, daily exposure opportunity, organic multiplier and sentiment decay. Day-by-day output and month-end / monthly-new-reach roll-ups are provided. Original eight diffusion ticks have no calibrated day duration. These graphs are hypothetical scenarios, not observed forecasts.

## Effectiveness fixes and historical evidence

Risk analysis also sees low-attention and uninterested comments, not only high-backlash comments. Repeated feedback about vague benefits or overly general messaging can trigger a weak-value-proposition fix. Rewrites must name an existing, defensible benefit, never invent product claims, and are re-tested with new individual reactions. Missing product facts require clarification.

The Holywings June 2022 case has a sourced qualitative comparison panel. Religious objections, a company apology, and government licensing action are distinguished. The stated basis for revoking 12 outlet permits was licensing violations; no sole-cause claim or financial-loss figure is inferred. A live check of 20 individual gpt-5.6-luna judgments identified religious sensitivity in 18. This is not a representative public-reaction percentage or a blind held-out validation; the model may know the historical event. The source-backed outcomes remain separate from persona prompts.

## Performance and validation

The login shell loads before the workspace. Dashboard/map components are lazy-loaded, browser-only display helpers avoid shipping validation schemas, the source logo is served through Next image optimization, maps redraw on changes rather than continuously, and event recordings load only when replay is requested. The browser surface binds on the LAN for phone testing; the core stays on loopback.

Six TypeScript tests and twelve Rust tests pass, including deterministic individual profiles, scenario bounds, existing fairness checks, and evidence-backed effectiveness diagnosis. The mock integration test completed 500 separate individual reactions, then verified two-account isolation, persisted discussion/charts, a 60-day scenario, password/session rotation, account deletion, mobile layout, and conversation scroll restoration with no browser errors. Dedicated frontend regression checks cover the status-dot sizing and prompt clearing. The exploration account is separate from automated QA accounts.

## Follow-up interface feedback

Controls now share a sizing and spacing scale. Multiple campaigns includes an explanatory line; headline, supporting message and visual reference have distinct labels and help text. Optional reference images are authenticated, size/type checked and read once by OpenAI into a description. The image payload is not sent to every person or retained in the conversation document. Live image-input verification succeeded with the supplied public logo.

Tools closes on outside pointer input and Escape. Settings offers General, Simulation, Integrations, Usage & limits and Account. Preferences are saved per account and apply to new conversations. Provider billing links to the actual provider dashboard instead of presenting an unimplemented application subscription. Browser QA verified reference upload in mock mode, saved preferences, mode defaults, outside-click dismissal, Escape and mobile overflow. Production serving is available with npm run build followed by npm start.
