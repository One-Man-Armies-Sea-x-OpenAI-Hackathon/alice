# 11. Pitch

All presentations are in English. Judges score four things: problem framing, quality of build, depth of thinking, and how well Codex was used. Round One is 5 to 10 minutes at the table, in rotation, on a laptop. The Top 5 present on stage at 18.40. Prepare both versions.

## 1. One-liner
**Alice rehearses your campaign on a synthetic Indonesia before launch: thousands of simulated Indonesians react, spread and push back, and you get a reaction map, a ranked winner, cultural risks and fixes in minutes.**

Build directions: **Autonomous and Adaptive AI** and **Deep Domain AI**. Say both out loud.

## 2. Round One script (5 minutes)
| Time | Part | Who |
|---|---|---|
| 0:00 to 0:45 | **Problem.** One user, one decision: a campaign manager must choose a direction before media money is spent, and today that choice runs on gut feeling. Name the unmet need in those words. Give one public Indonesian backlash case, with its source. | Presenter |
| 0:45 to 3:00 | **Live demo.** One real live run. See section 4. | Presenter, with a second person on the keyboard |
| 3:00 to 3:40 | **Why trust it.** Single call versus Alice, the Robustness line, the recommendation gate, and where Alice is wrong. | Presenter |
| 3:40 to 4:20 | **How Codex built it.** The Codex slide. | Second speaker |
| 4:20 to 5:00 | **Why Indonesia, and close.** SARA, language register, regions, and calendar. Then: "Minutes, not a campaign budget." | Presenter |

Use any extra time for judge questions and the live test: "Give us a campaign idea and we will run it now."

## 3. Stage version (Top 5)
Same order, longer. Add how it works (Brief, Clarify, Audience, Reactions, Our engine, Fix loop), the depth table, and who it is for: brand and campaign teams first, then agencies, FMCG and e-commerce, and civic groups. No pricing slide, target market only.

## 4. Slide outline (single HTML deck, arrow keys, large type, no heavy animation; burgundy, red and cream from the Alice logo, logo on the title slide)
Title and tagline; the problem with one user and one public case; the solution in one sentence with a screenshot; how it works (one diagram); one call versus Alice; why trust it (Robustness check and recommendation gate); where Alice is wrong; why Indonesia; how Codex built it; team and thank you.

Mark the extra slides for the stage version: depth and scale, impact and target market, and what is next. Put real screenshots and real numbers from the day in the deck.

**The Codex slide** is about method, not only counts. Cover the contract-first split, `AGENTS.md` rules, the Docs MCP rule, parallel sessions per owner, and test-gated prompts. Include one real case where a test or Codex caught a bug. Use real numbers from Vincent's log only.

**The "where Alice is wrong" slide** says what Alice cannot do. Reactions come from language models, which can carry stereotypes. The engine constants are our own picks, and the constants test shows how much they matter. Results repeat exactly only when reactions come from the cache. Nothing has been checked against real campaign outcomes yet.

## 5. Live demo script (about 2 minutes)
1. Skip the tour. Start on the composer with the Langkah Run card: "A local shoe brand for Independence Day, three creative directions." Point out Compare mode and the depth selector. Choose Standard or Quick, and Send.
2. If questions appear, answer them: "Alice only asks what changes the answer."
3. Run view: narrate briefly: "It builds an audience from Indonesian data, agents react as each segment, then we spread it through a social network, the same audience for every variant." Point at the coral lines: "That is anger spreading." Skip to the dashboard if time is short.
4. Reaction map first: "A single ChatGPT call can tell you young people like A and older people like B. What it can't tell you is where, by how much, and how sure we are." Show which regions flip and by how many points, and read one quote from its English line. If the Robustness line says too close to call, say that. It is a real finding.
5. Risk flags and spread: "Variant C prints the national flag on the sole." Show its reach from anger and its score as the screen shows them. If outrage spreads it far: "It spreads because people are angry. It may even score well, but Alice will not recommend it."
6. Fixes: "Nobody pressed anything. Alice rewrote it, re-tested it on the same audience, and here is the before and after." If the score dropped or it needs a person, say so.
7. Overview, the "One call versus Alice" box, read in both directions: "Here is what the single call got right, what it raised that we did not, and what it could not tell us." Read only what the run produced. This bridges into "Why trust it".

If a replay is used, say it is a replay. Never name the winner in the script before the run. Read it from the screen.

## 6. Talk split (decide by 12.30)
One person owns the presentation layer and storyline. Most of the talking stays with them, with a second speaker on the Codex part and a second person on the keyboard. The fourth person runs the clock and the backup. All four must be present for every session.

## 7. Q&A preparation
| Question | Answer |
|---|---|
| Why not just ask ChatGPT? | We run that single call on every run and show it beside Alice, in both directions. On our hero brief it gets the direction right: the winner, the flag risk, young for A and older for B. Alice adds what one call cannot: which regions and by how many points, how confident the result is, how backlash spreads, and a fix re-tested on the same audience. We also show what the single call raised that Alice did not. One published experiment (WPP Media research on the MiroFish swarm engine) found a swarm gave the same prediction as a single call, which is why we test this instead of assuming. Check that source before quoting it. |
| Is this accurate? | It is directional. Reactions come from language models role-playing audience segments, calibrated to Indonesian data. We do not claim statistical validation. The next step is calibrating against real campaign outcomes. |
| How do you know the winner is real? | The Robustness check. We run the top variant twice to measure LLM noise, resample the audience, and move our engine constants up and down. A win smaller than the noise is called a tie. |
| Your engine constants are made up. | Yes, they are design choices. That is why the constants test exists: we move each one up and down 20 percent and check the winner. It rarely changes the winner, partly because a constant moves every variant alike, so we show it as its own line and never fold it into a big total. The audience test and the noise floor carry more of the weight. |
| What do 1,500 agents add over 48 archetypes? | Network effects. An objector shares more, so a bad variant can go viral for the wrong reasons. A plain average cannot show that. LLM cost stays tied to archetypes. |
| Is the demo result baked in? | The demo risks are not in the reaction examples, so the simulated people find them alone. The risk analyst does use a catalog of known patterns, and we say so. Give us your own campaign and we will run it now. |
| Why not run a full agent society where every agent talks to every other? | Cost, speed and fairness. We use language models where judgment matters (one reaction per audience archetype) and our deterministic engine for population-scale spread. Every variant meets the identical audience and seed. |
| Is it reproducible? | The engine is, for the same reactions. The LLM is not fully repeatable, so a whole run repeats exactly only from the cache. The noise floor measures that gap. |
| What does "verified" mean for a fix? | We re-score the rewrite with new reactions, including people who did not object to the original, and re-run with the same seed. A fix can lower the score, and we show that. |
| How is this different from existing audience-simulation tools? | Others exist (for example Artificial Societies, Aaru, Socialtrait, SightsAI, Lumina). Alice is built for Indonesia: real regional and religious distributions, Bahasa register, a SARA and local-norms risk catalog, an automatic fix loop, and a deterministic engine we wrote ourselves. |
| Where does the data come from? | BPS census, APJII internet surveys, Dukcapil religion data and GWI platform data. Finer splits are calibrated estimates and labeled as such. |
| How do you handle sensitive topics? | Alice flags risk and helps fix it. Its guardrail refuses to help design content that targets groups with hate, violence or harassment, and results are always labeled synthetic. |
| What are the limits? | Language models can carry stereotypes. We avoid caricature in prompts and show evidence for every flag. Synthetic personas are not real people. Small segments are noisy and marked as such. |
| Does it scale? | LLM calls scale with archetypes, not personas. Results are cached by input. |
| What would you build next? | Calibration against real campaign outcomes, province-level data, creative analysis at scale, brand-specific audience data, and exports for agencies. |
Be ready to explain why the engine is ours: reproducibility, fairness, speed, and the hackathon rule.

## 8. Claims to avoid
"Predicts" or "accurate to X percent"; "real people"; "fully reproducible"; any number not produced by the demo. Say "simulates", "estimates", "directional".
