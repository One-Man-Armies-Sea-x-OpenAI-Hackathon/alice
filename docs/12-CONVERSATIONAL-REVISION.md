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

## Background campaigns and confirmed references

The directions editor now occupies the right panel on desktop and a drawer on phones. The bottom composer contains the campaign conversation only. Mode labels are Single direction and Multiple directions: one conversation is one campaign. Running and preparing conversations remain available in the sidebar while new campaigns are started. The active viewer uses a resumable SSE stream; lightweight owned-run summaries update background statuses. Switching conversations closes only the viewer, never the server simulation. Model submissions are bounded per run before entering the shared limiter, so interactive requests are not queued behind an entire audience. Conversation writes are serialized in each browser session. Accepted intake task IDs are saved so a browser reload can reconnect to pending brief processing.

Brief intake, dashboard discussion and image reading support short asynchronous requests with private task polling. Existing synchronous developer callers remain compatible. Empty or non-JSON gateway responses are decoded into actionable errors; they never surface JSON parser exceptions. Selecting an image only creates a local preview. Confirm and read reference triggers upload, with measured upload progress followed by an indeterminate reading bar and elapsed time. A campaign waits for its confirmed references to finish before submission. Raw image payloads are not written to history. Temporary processing tasks expire after an hour and disappear on server restart; a restart requires a retry. Simulations continue across chat navigation, but they are not durable worker jobs across server restarts.

Validation: nine TypeScript and twelve Rust tests pass. Browser QA covers two independent campaigns, navigation while requests are in flight, correct results after returning, the right-hand editor, confirmation before upload, reading progress, empty responses from both intake and reference endpoints, account isolation, phone layout, and the earlier composer/status regressions. A live reference using the public supplied logo was accepted in 23 ms and finished in about 7 seconds with one model call. The larger scenario tests use mock judgments with the real Rust engine. Production output is isolated in .next-production so production builds do not overwrite development assets.

The OpenAI Docs MCP was consulted for current web-search and remote-MCP capabilities. Public external research is now enabled by default before the first planner response. It creates a cited, dated context artifact with sourced findings, explicitly hypothetical campaign opportunities and missing internal inputs. Public research and private MCP records should be queried separately. Fulfillment and profit scenarios need internal order, capacity, margin and cost inputs; public sources alone do not establish those values.

## Direction planning and UI polish

The user explicitly approved the contract change for dynamic uppercase direction IDs (A through Z, then AA, AB, etc.) and removal of the three-direction planning limit. Existing field names and A/B/C recordings remain compatible. Multiple directions starts with two directions. IDs remain stable when another direction is removed. Rust validates complete, unique reactions for every individual in every supplied direction, with no fixed direction-count limit. The per-run model-call cap remains in force and an oversized plan is stopped before model calls. Visualizations reuse the approved palette and pair colors with direction labels.

The sidebar now transitions over 360 ms, multiline editors grow until 240 px before scrolling, conversation deletion asks for confirmation, and loading dots move independently. Reduced-motion preferences disable motion. The Campaign lab breadcrumb is removed. Validation includes 25 unit tests and browser checks covering 27 planned directions, a five-direction/2,500-reaction mock run, a chart for AA, budget protection, mobile layout and all new UI interactions. A live clarification preserved A/B/D/AA and asked a further context question.

## External research in the planner

Tools and account preferences control public research. The first intake extracts public brand/category terms, then calls the OpenAI Responses web_search tool on the configured persona model. The search request is limited to two tool uses, has no automatic transient retry, and uses a dated hourly cache. The same account-owned snapshot is reused across clarification answers and persisted with the run. Provider-returned source metadata gates displayed links; uncited claims are omitted. Source dates and event dates are separate, and contradictory evidence must be reported as a gap. Private business-data MCP connections remain unconfigured.

The search model receives extracted public terms, not the raw brief or attachments. Common secret/contact patterns in the extracted terms block search. This is not a guarantee of perfect model extraction. The UI reports progress, calls and estimated usage, with clickable citations in the conversation and dashboard Evidence tab. MOCK and offline replay make no research calls and explicitly identify the absence of current web evidence. Search failure allows planning to continue with uncertainty visible.

Validation: 29 unit tests, production build, and research browser/API QA pass. Checks include account isolation, follow-up snapshot reuse, saved defaults, tool toggle, recorded run/history, citations and mobile overflow. One live Shopee intake completed in approximately 26 seconds: two research model calls, one hosted search tool use, and approximately $0.015 research usage, plus the existing guardrail and clarification calls. No live audience simulation was launched for this check. Source matching establishes provenance, not independent factual verification.
