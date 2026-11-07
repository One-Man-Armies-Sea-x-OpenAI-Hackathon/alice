# 10. QA and demo day

## 1. Acceptance tests by area
**Core (Malvin, Vincent runs them):** determinism, fairness, sums, ranges, coverage, monotonic sense and scale as listed in `06-SIMULATION-SPEC.md` section 11. Performance table in `02-ARCHITECTURE.md` section 9 measured at each tier on the presenting laptop.
**Agents (Fabian):** every LLM output validates against its schema; failures degrade to neutral and are counted; cache hit on a repeated run is 100 percent; the guardrail blocks a clearly hateful brief and allows all test briefs; the clarifier asks only for missing fields and never more than three questions; risk flags match the expectations in `09-TEST-BRIEFS.md`; a high-flag variant is never recommended; the fix loop stops after two rounds and asks a person if a flag remains; rewrites introduce no new flags; the pre-run estimate is within a reasonable margin of actual calls; a dead first key moves to the next key with no lost reactions.
**Web (Rifqi):** walk the whole flow in both themes; attach files; toggle each tool and see the effect; switch depth tiers and see persona counts and estimates change; compare and single modes; multiple sessions; renaming; deleting; cancel and skip during a run; replay; every dashboard tab at every tier built; English lines on every quote and variant shown; keyboard and reduced-motion behavior; the layout on a laptop screen and at the presenting resolution.
**Persistence and demo (Vincent):** runs and results survive a restart; the chat list survives a page reload; the demo briefs replay from cache with no network; replays preserve event timing and are labeled as replays.

## 2. Test matrix for depth
Run the Langkah Run demo at every tier built (quick and standard, plus deep if built). For each record: end-to-end time, LLM call count, cache hits, failures, browser frame rate in the run view, dashboard load time, and whether the winner and flag set are consistent with the lower tiers. Expect the winner and the main flag to be stable across tiers; if not, investigate noise versus a real bug.

## 3. Calibration checks (human judgment)
- Do reactions read as natural Indonesian in the right register for age and platform?
- Are the objecting personas the ones you would expect (for example, older Muslim audiences on the Santa hat variant)?
- Do region scores look plausible (not all regions identical, not wildly random)?
- Is the confidence word sensible given the margin and the noise floor?
- Does Alice find anything the single call missed, and what did the single call raise that Alice did not? Read both lists on every demo brief before the pitch. On Langkah Run, expect the single call to get the direction right (tested 6 Nov), so Alice's value has to show in regions, points, confidence, spread and fixes. If it shows nothing there, tune the demo or say so honestly.
Fix prompts or parameters, not the data tables, unless a table is clearly wrong.

## 4. Rehearsal plan
All rehearsal fits in 15.30 to 16.30, so keep each one short.
- One timed run of the 5-minute Round One version, in English, on the laptop, with one live run.
- One run-through with the network off using the cached demo.
- One run-through where someone else drives the keyboard.
- If the team reaches the Top 5, use the gap from 18.30 to 18.40 to set up the stage version.

## 5. Fallbacks (in order)
1. Live run at standard depth if the network is good. Show at least one real live run in Round One, because the website asks for a working product.
2. Cached replay of the same demo (looks identical, instant). Always say it is a replay.
3. Screen recording of a full cached run (recorded after the 15.30 freeze).
4. Static screenshots in the deck.
Decide who calls the switch and the phrase to say ("Let me show you a recorded run so we stay on time").

## 6. Cache priming
After Checkpoint 2 at 14.30, run each demo brief once at the tier you will show on stage (and the lower tiers) so every reaction call is cached and a recording exists. Verify by unplugging the network and replaying.

## 7. Pre-flight checklist (at 16.30, before Round One at 16.45)
- Submission sent. Charged laptops, charger, adapters, a second laptop with the same build.
- Browser zoom and resolution set; notifications off; dark theme on; English lines on.
- Services started; health checks green; demo cache present; offline replay tested.
- Key pool valid and has headroom; the demo key is still unused; spend limit not hit.
- Deck open; backup video ready to play; speaker notes at hand.
- All four members present. Roles confirmed: who speaks, who drives the demo, who watches the clock.

## 8. Bug triage during the freeze
Only fix: crashes, wrong numbers, broken flows, unreadable text, anything that would embarrass on stage. Everything else goes on a "later" list.
