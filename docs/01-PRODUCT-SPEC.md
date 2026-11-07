# 01. Product and UX spec

This describes the approved demo, extended for real data and depth up to 5,000 agents (Deep is optional). **In the UI, synthetic personas are called "agents"** (the engine docs call them personas; they are the same thing). Brand, colors, the logo and animation details are in `08-DESIGN-SYSTEM.md`. Data shapes are in `03-CONTRACTS.md`.

## 1. Principles
- The map is the hero. Everything else is calm and quiet around it.
- Ask only what changes the answer. Never interrogate.
- Show the work: the user watches Alice build an audience, collect reactions, spread them and score them.
- Be honest: results are directional. Reasons must be grounded in simulated reactions, never invented.
- Works on a projector: large type, high contrast, no tiny labels.

## 2. Screens and flow
1. **App shell** with sidebar, top bar and chat (no login; the app opens here). 2. **Composer** (brief, attachments, tools, depth, mode). 3. **Clarifying questions** inside the chat. 4. **Run view** (minimal cinematic simulation). 5. **Dashboard** (six tabs). Users can leave and return; every session keeps its brief, messages and result.

## 3. No login
Cut on 6 Nov. The app opens straight on the app shell as a fixed demo user (name "Demo user"). There is no sign-in, sign-out or auth screen. The large logo tile sits above the empty-state heading instead (`08-DESIGN-SYSTEM.md` section 1).

## 4. App shell
**Sidebar** (collapsible, hidden by default on narrow screens):
- Brand and collapse button. A primary **New chat** button.
- **Chats**: a simple list, newest first. There are no project folders.
- Each chat row shows a status dot (grey idle, gold waiting for answers, cream pulsing while running, green when done), the title, and a hover-only delete.
- Footer: avatar with initial, the demo user name, and the theme toggle (dark default, light option). No sign out.

**Top bar:** editable chat title, a Chat/Dashboard switch once a result exists, and a Replay simulation button on the dashboard.

**Seed data for demos:** three finished chats so multiple sessions are visible immediately (Independence Day, Ramadan and Lebaran, Civic campaign). They should open straight to a real cached result. The chat list and messages live in the browser.

## 5. Empty state
Large heading "What are we testing today?", one paragraph, four demo cards (title, one-line description, small tags), and a four-step strip: Brief, Clarify, Simulate, Decide. Clicking a demo card sets the mode, types the brief into the composer with a short typewriter effect, and fills the variant cards. The user presses Send. If they press Send while it is still typing, finish the text first. The four demo briefs are in `09-TEST-BRIEFS.md` (Langkah Run is the hero, Kopi Senja shows clarifying questions, Ciliwung is the single-campaign activist case, Tiket Ceria shows a religion risk).

## 6. Composer
A rounded card pinned to the bottom of the chat.
- **Free text box** that grows up to about 220 px. Enter sends, Shift+Enter inserts a newline.
- **Attach**: button and drag-and-drop. Accept text, markdown, and CSV files only (image analysis was cut on 6 Nov). Show a chip with a file icon, name and a remove button. The files are read and added to the brief.
- **Tools popover** (a badge shows how many are on): Persona swarm (always on, locked), Risk and SARA scan, Cultural calendar, Auto-rewrite fixes. Each is a toggle with a one-line description. They really change the run: risk off removes the risk step and tab; rewrite off removes the fixes step and tab; calendar off disables season and religion timing context.
- **Depth selector** (model and scale): Quick 500 and Standard 1,500 agents, plus Deep 5,000 only if it is built (hide the row otherwise). The button shows the current choice (for example "Standard, 1,500 agents"). Each row shows the agent count, the archetype count, and the estimated number of reaction calls for the current number of variants. Next to the send button show a live estimate of LLM calls and time that updates with depth, mode and variant count. Use the formula in `PLAN.md` section 7, and set the time from real runs.
- **Mode switch: Single campaign or Compare campaigns.** In Compare mode a tray appears above the text box with 2 to 3 variant cards (A, B, C). Each card has a colored marker, its own text area for headline, copy and visual idea, its own attach button, and a remove button when there are more than two. An "Add variant" tile appears until there are three. The main text box then holds the shared brief (brand, audience, channels, timing).
- **Send** button (disabled while a run is active). Empty send shakes the composer.
- Footer line: "Alice simulates audiences. Treat results as directional, not a forecast."

## 7. Chat thread
- User messages on the right in a soft bubble: attachments as chips, text, per-variant blocks with colored tags (variant label plus first lines), and small tags for mode, depth and number of tools on. Short answers to clarifying questions show only the text.
- Alice messages on the left with the logo as avatar, no bubble background. Typing indicator with three bouncing dots for about a second between steps.
- Clarifying question messages are cards (below). Result messages are summary cards.

## 8. Clarifying questions
Triggered after Send. Alice first says what it read: how many variants, the brand, and any attached files. Then it asks **at most three** questions, one at a time, each as a card with option chips plus a small "type your own answer" field. Ask only what is missing and decision-critical, in this priority:
1. **Variants**: if the user chose Compare but supplied one variant, offer to draft two alternatives ("Yes, draft 2 alternatives" or "No, run it as a single campaign"). Drafted alternatives are labeled as AI drafts.
2. **Channel**: TikTok, Instagram, Outdoor / billboard, YouTube, WhatsApp, Multiple channels.
3. **Audience location**: Nationwide online, Jabodetabek, Java, Outside Java. The answer sets where the campaign is placed: agents there and on the chosen channels see it first, everyone else mostly through sharing (`06-SIMULATION-SPEC.md` section 5).
4. **Seasonal moment**: Ramadan, Payday week, Independence Day, Christmas / New Year, None.
If channel, location or season are already clear from the text, skip those questions. If nothing is missing, say so and start. After the last answer, Alice summarizes what is locked in (brand, variants, channels, location, timing) and starts the run. Answered cards are locked and the chosen chip is highlighted. In the real build the questions come from the clarifier agent (`prompts/runtime/clarifier.md`), not fixed rules, but must follow these constraints.

## 9. Run view
Replaces the chat while a run is active. **Build the minimal cinematic version first.** It must already feel like a film of the run: the map visibly changes at every stage, with nothing extra. The polish list below comes only after Checkpoint 2, if time remains.

**Layout.** Header: "Simulating <brand>" (or "Replaying"), a subtitle with variants, agents, depth and seed, "Skip to dashboard" and Cancel (Close when replaying). A stepper of stages. A large map card on the left (about two thirds), and on the right a feed card above a telemetry card.

**Stages, minimal cinematic version** (shown in the stepper; risk and fix only appear if those tools are on):
1. **Reading the brief.** The map dots brighten once, gently. The feed ticks off what was read: variants, channels, location and timing, attached text files, or the calendar context.
2. **Building the audience.** Agents fade in on the map in a few batches, colored by their main platform, clustered around real cities. The feed notes sampling from BPS, APJII and Dukcapil distributions, placing by region, city and tier, and linking neighbours.
3. **Agents react.** One card per audience archetype slides into the feed: archetype label, persona count, an in-character Indonesian comment, and a pill per variant with its mean sentiment. As each card arrives, that archetype's agents on the map recolor by sentiment (coral negative, gold neutral, green positive). With up to 96 archetypes the card cadence adapts (never faster than about one card per 120 ms; counters always show true totals; only a rolling window of about six cards is visible).
4. **Simulating spread.** One variant at a time, same audience and seed. Newly exposed agents brighten; thin straight cream lines flash from sharer to newly reached agent (capped per tick), coral when the spread is driven by anger; unreached agents dim. The feed logs each tick (newly exposed, share reached).
5. **Rolling up results.** A score bubble appears on each region, sized by audience share and colored by the winning variant (or by the single variant's score).
6. **Risk and SARA scan.** Warning markers drop on the most affected regions (coral with "!" for high, gold for medium). The feed lists each risk found with severity; if none, it says so.
7. **Fix loop.** Alice works by itself: rewrite, re-score, re-run, check again, for up to two rounds per flag. A marker turns green when its flag clears. A marker that does not clear stays gold with "needs a person". The feed lists each round and what changed.
8. **Dashboard ready.** A brief flash, then the dashboard opens.

**Polish list, only after Checkpoint 2, in this order:** curved traveling arcs with a bright head instead of straight lines; halo and ring pulses on newly exposed and reacting agents; the cream scan sweep while reading the brief; non-overlapping city labels during the audience stage; the cumulative exposure line chart in telemetry and per-variant exposure bars in a bottom panel; agents folding toward region centers at roll-up; the coral sweep with objecting rings in the risk stage; a 1x and 2x speed toggle.

**Live versus paced.** In real runs each stage is tied to real backend progress (events in `03-CONTRACTS.md`). Every stage has a minimum display time so the animation feels intentional when the backend is fast, and shows a gentle waiting pulse when it is slow. The replay of a cached run uses the recorded events with their original relative timing. Skip jumps straight to the dashboard. The run keeps going, and if the fix loop is still working, the Fixes tab shows "Alice is still fixing" and fills in as rounds finish. Cancel returns to the chat with a "Run cancelled" message.

**Telemetry** (six figures): agents (true count), reaction calls (true count), spread tick, exposed share, backlash events, archetypes. **Legend** changes per stage (platform colors, then sentiment colors with "not reached").

## 10. Result message
After a run Alice posts a result card in the chat: "Recommended: Variant B, Warm family" (or the predicted impact for single campaigns), a confidence tag, a score bar per variant, the first insight line, a risk flag count with the top flag title, and two buttons: Open dashboard and Replay simulation. If the top scorer has a high-severity flag, the card says "Highest score, but do not launch as is" beside that variant. If the margin is under the noise floor, it says "Too close to call".

## 11. Dashboard (six tabs)
Header: brand name, tags (variants, agents, depth, seed, Ramadan context if on), and Export PDF (browser print).

1. **Overview.** A winner banner: "Recommended: Variant X, label", a plain sentence of why, how many of the seven regions it leads, the lead in points, and a confidence word (High, Medium, Low). If the top scorer is blocked by a high-severity flag, the banner shows the recommended variant and a second line: "Variant Y has the highest score, but do not launch as is." For single campaigns: "Predicted impact N out of 100" and the confidence. Under the banner, one Robustness line that shows the three tests side by side, in the form "Robustness: audience test 197 of 200 · constants test 10 of 10 · noise floor 2.3 points", and opens to explain each one in a sentence. Never add them into one total. Below, a ledger table with one column per variant and rows Impact score, Reach, Sentiment, Engagement, Backlash, Reach from anger, with numbers counting up, bars growing, and the best per row highlighted. Then a "One call versus Alice" box: what a single LLM call said beside Alice's result, with two lists: "What the single call missed" and "What the single call raised that Alice didn't". Each item in the second list carries a tag: "Not backed by the simulation" or "Not something Alice simulates". If a list is empty, say so in a plain sentence. Then two boxes: a "how fast each variant spreads" line chart, and "What to know" (three or four insights) plus "Next steps" (review risk flags, localised test for a segment where the loser wins, re-run on a deeper tier).
2. **Reaction map.** Variant switch (compare mode) and metric switch (Impact score, Reach, Sentiment, Backlash), a color ramp legend, the dot-matrix map colored per region with a value bubble and name on each region, hover tooltip (region, score, reach, sentiment, backlash), click to select. A side panel: with no selection, regions ranked by score; with a selection, the region's share of the online audience, a score bar per variant, reach, sentiment and backlash figures, best and weakest age or platform group in that region, and two real simulated quotes (one positive, one negative) with persona tags.
3. **A/B ranking** (called **Segments** for single campaigns). A dimension switch: Region, Age, Platform, Religion, City tier. A table row per segment: name, share of audience, a score bar per variant, the winner chip with margin (or Strong / Average / Weak spot for single campaigns), and an expandable "why" sentence grounded in the numbers. Footnote: segments under 3% are noisy.
4. **Risk flags.** Cards sorted by severity: severity tag, category tag, variant tag, share of reached people who object, title, explanation, affected segment chips with their backlash rate, one quote in a speech bubble with persona tags, and a button to the fix. If the scan was off, an empty state explains how to turn it on. If nothing was found, a positive empty state.
5. **Fixes.** One card per risk, already filled in by the fix loop: original versus suggested rewrite side by side (headline, copy, visual), a short "what changed" list, the number of rounds, and a status tag (Cleared or Needs a person). Each card shows before and after for impact score, backlash and sentiment, with the same seed and audience, and how many affected and control archetypes were re-scored. A fix that lowered the score says so plainly. A "Run the fix loop again" button repeats it on demand. A person must accept a rewrite. Alice never replaces the original by itself. If nothing needs fixing, suggest running the loser as a localised test where it wins.
6. **Agent feed.** A scrolling list of simulated reactions (up to about 60 shown) with a colored avatar showing the platform initials, the comment, persona tags, and a tag when the persona shared or objected. Filters: variant, All, Positive, Negative, Backlash.

## 12. English lines for judges
Judges come from across the region, so Indonesian text needs English beside it. Every persona quote, variant headline, and variant copy shown on screen has a smaller English line under it. A toggle in the dashboard header hides the English lines. The run view feed stays Indonesian only, because translation runs at the end of a run.

## 13. States, errors and accessibility
- Loading, empty and error states for every async surface. A failed LLM call degrades to a neutral reaction and is counted; if too many fail, the run stops with a clear message and an option to retry or lower the depth.
- Keyboard: Enter to send, Escape closes popovers, visible focus rings, buttons are real buttons, sufficient contrast in both themes, motion respects reduced-motion preferences (shorter, simpler transitions).
- Responsive down to a narrow laptop; below about 820 px the sidebar overlays and grids stack. The dashboard must read well on a laptop screen for Round One and on a projector for the stage.
- All user-facing copy is English except persona speech, which is Indonesian with an English line (section 12).
- A replay is always labeled as a replay on screen.

## 14. Non-goals
No real user data, no social platform posting, no claim of statistical accuracy, no multi-tenant auth.
