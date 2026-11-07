# Runtime prompt: orchestrator workflow rules

Purpose: define the top-level workflow rules for the run. The run workflow itself is deterministic code that calls specialist agents in order (see `docs/02-ARCHITECTURE.md` section 3). Ask Alice was cut, so there is no conversational layer.

## Workflow rules (for the code that coordinates a run)
- Order: guardrail, clarifier, audience, blurbs, reactions with the single-call baseline in parallel, simulate, aggregate, noise floor set and Robustness check, then explain and risk in parallel, then the recommendation gate, the fix loop, the baseline comparison and translation. Emit the events listed in `docs/03-CONTRACTS.md` section 10 at each step.
- A variant with a high-severity flag is never recommended as is. Keep the top scorer visible with a note.
- The fix loop runs by itself, up to two rounds per flag. If a flag remains, set the status to needs_human and stop. Never replace the original variant without a person accepting the rewrite.
- Respect `MAX_CALLS_PER_RUN`. Show the estimate before starting. Never exceed the cap silently.
- A failed reaction call retries, then degrades to a neutral reaction and counts as a failure. If too many fail, stop the stage with a retryable error.
- A key with used-up credit moves to the next key in the pool. That is not a failure.
- Cache every LLM call by a hash of prompt version, model, inputs and sample number. Cached calls still emit their events so replays look identical.
