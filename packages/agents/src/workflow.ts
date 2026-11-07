import type { ExternalContext } from "./research";
import { effectivenessFindings } from "./effectiveness";
import pLimit from "p-limit";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import {
  ReactionSchema,
  BaselineModelSchema,
  RiskListSchema,
  RewriteSchema,
  BlurbsSchema,
  ResultSchema,
  type Campaign,
  type Reaction,
  type Archetype,
  type Result,
  type RiskFlag,
  type Fix,
  type Event,
  type Audience,
} from "@alice/contracts";
import {
  Budget,
  BudgetError,
  structured,
  prompt,
  catalog,
  core,
  storeGet,
  storePut,
  root,
  mockMode,
  estimate,
  poolStatus,
  preflight,
} from "./foundation/index";
import { guardrail } from "./intake/index";
import { explain, translate } from "./explain/index";
import { mockReaction, mockFlags, mockRewrite } from "./mock";
export type Run = {
  id: string;
  campaign: Campaign;
  events: Event[];
  result: Result | null;
  audience?: Audience;
  reactions: Reaction[];
  outcomes: any[];
  status: "running" | "done" | "failed" | "cancelled";
  error?: string;
  mock: boolean;
  replay: boolean;
  cancelled: boolean;
  started: number;
  owner_id?: string;
  research?: ExternalContext;
};
const globalRuns = globalThis as unknown as { aliceRuns?: Map<string, Run> };
const runs = (globalRuns.aliceRuns ??= new Map<string, Run>());
function event(run: Run, type: string, data: any) {
  if (run.cancelled) throw new Error("Run cancelled");
  run.events.push({
    run_id: run.id,
    seq: run.events.length + 1,
    time_ms: Date.now() - run.started,
    type,
    data,
  });
}
function stage(r: Run, id: string, index: number) {
  event(r, "stage", { id, index, total: 8 });
}
const telemetry = (r: Result, b: Budget) => {
  r.llm_calls = b.calls;
  r.cache_hits = b.cache_hits;
  r.failures = b.failures;
};
export function recommendationGate(r: Result) {
  const bad = new Set(
    r.risk_flags.filter((f) => f.severity === "high").map((f) => f.variant_id),
  );
  const eligible = [...r.per_variant]
    .sort((a, b) => b.overall.score - a.overall.score)
    .find((v) => !bad.has(v.variant_id));
  r.overall.recommended = eligible?.variant_id ?? null;
  r.overall.recommendation_note = bad.has(r.overall.winner)
    ? `Variant ${r.overall.winner} has the highest score, but do not launch as is. A high-severity risk blocks recommendation.`
    : "";
}
// Bound each run's submitted calls so interactive requests and other runs can
// enter the existing global model limiter instead of waiting behind 1,500 calls.
const reactionQueues = new WeakMap<Budget, ReturnType<typeof pLimit>>();
async function react(
  c: Campaign,
  a: Archetype,
  v: Campaign["variants"][number],
  b: Budget,
  sample = 1,
): Promise<Reaction> {
  try {
    let queue = reactionQueues.get(b);
    if (!queue) {
      queue = pLimit(Math.max(1, Number(process.env.LLM_CONCURRENCY || 8)));
      reactionQueues.set(b, queue);
    }
    const r = await queue(() =>
      structured(
        "reaction",
        ReactionSchema,
        "You are ONE individual synthetic person, not a demographic average. Use your unique seeded personality in the blurb. Do not infer personality from religion or ethnicity. Different people in the same segment may disagree.\n" +
          prompt("archetype-reaction") +
          "\n" +
          prompt("fewshot-bahasa"),
        {
          campaign: {
            ...c,
            timing: c.tools.calendar ? c.timing : "Calendar context disabled",
            variants: undefined,
          },
          archetype: a,
          variant: v,
        },
        b,
        { role: "reaction", sample, mock: () => mockReaction(c, a, v) },
      ),
    );
    if (r.variant_id !== v.id || r.archetype_id !== a.id)
      throw new Error("Reaction identity mismatch");
    return r;
  } catch (e) {
    if (
      e instanceof BudgetError ||
      String(e).includes("credits") ||
      String(e).includes("401") ||
      String(e).includes("403")
    )
      throw e;
    b.failures++;
    return {
      archetype_id: a.id,
      variant_id: v.id,
      attention: 0.4,
      sentiment: 0,
      share_likelihood: 0.05,
      click_likelihood: 0.02,
      backlash_risk: 0,
      backlash_category: "none",
      reason: "Model call failed; neutral fallback.",
      sample_comment: "[Neutral fallback; no simulated quote available]",
    };
  }
}
async function analyze(
  c: Campaign,
  r: Pick<Result, "per_variant">,
  rs: Reaction[],
  archetypes: Archetype[],
  b: Budget,
) {
  const selected = c.variants.flatMap((v) =>
    rs
      .filter((x) => x.variant_id === v.id)
      .sort(
        (a, b) =>
          b.backlash_risk +
          (1 - b.attention) * 0.5 +
          Math.max(0, -b.sentiment) -
          (a.backlash_risk +
            (1 - a.attention) * 0.5 +
            Math.max(0, -a.sentiment)),
      )
      .slice(0, 25),
  );
  const comments = selected.map((x) => ({
    comment: x.sample_comment,
    reason: x.reason,
    attention: x.attention,
    variant_id: x.variant_id,
    category: x.backlash_category,
    persona_tags: Object.values(
      archetypes.find((a) => a.id === x.archetype_id)!.segment,
    ),
  }));
  const result = await structured(
    "risk_analyst",
    RiskListSchema,
    prompt("risk-analyst") + "\n" + catalog(),
    { campaign: c, per_variant: r.per_variant, comments },
    b,
    { agent: true, mock: () => ({ flags: mockFlags(c, r, rs, archetypes) }) },
  );
  const groupKeys = new Set(
    r.per_variant.flatMap((v) =>
      Object.values(v.by_dimension).flatMap((xs) => xs.map((g) => g.group)),
    ),
  );
  return [
    ...result.flags,
    ...effectivenessFindings(c, r, rs, archetypes).filter(
      (f) =>
        !result.flags.some(
          (x) => x.variant_id === f.variant_id && x.rule_id === f.rule_id,
        ),
    ),
  ]
    .slice(0, 6)
    .map((f, i) => ({
      ...f,
      id: f.id || `flag-${i}`,
      segments: f.segments.filter((s) => groupKeys.has(s.key)),
    }))
    .filter(
      (f) =>
        c.variants.some((v) => v.id === f.variant_id) &&
        rs.some(
          (x) =>
            x.variant_id === f.variant_id &&
            x.sample_comment === f.evidence.comment,
        ),
    );
}
async function fixFlag(run: Run, flag: RiskFlag, b: Budget): Promise<Fix> {
  const original = run.campaign.variants.find((v) => v.id === flag.variant_id)!;
  let previous: any;
  let fix: Fix | undefined;
  for (let round = 1; round <= 2; round++) {
    const rewrite = await structured(
      "rewrite",
      RewriteSchema,
      prompt("rewrite") + "\n" + catalog(),
      { campaign: run.campaign, variant: original, flag, previous },
      b,
      { agent: true, mock: () => mockRewrite(original, flag) },
    );
    const variant = { ...original, ...rewrite };
    if (rewrite.self_check_new_risks.length) {
      fix = {
        flag_id: flag.id,
        variant_id: original.id,
        original: {
          headline: original.headline,
          copy: original.copy,
          visual: original.visual_description,
        },
        rewrite: {
          headline: rewrite.headline,
          copy: rewrite.copy,
          visual: rewrite.visual_description,
        },
        changes: rewrite.changes,
        self_check_new_risks: rewrite.self_check_new_risks,
        rounds: round,
        status: "needs_human",
      };
      previous = rewrite;
      continue;
    }
    const arcs = run.audience!.archetypes; // All archetypes are rescored: includes every affected profile and every unaffected control.
    const newReactions = await Promise.all(
      arcs.map((a) => react(run.campaign, a, variant, b)),
    );
    const rr = await core("/v1/rerun", {
      audience_id: run.audience!.audience_id,
      variant_id: original.id,
      method: "rescored",
      reactions: newReactions,
    });
    const reviewed = await analyze(
      { ...run.campaign, variants: [variant] },
      rr.aggregate,
      newReactions,
      arcs,
      b,
    );
    const cleared = !reviewed.some((f) => f.severity !== "low");
    const affected = new Set(
      arcs
        .filter(
          (a) =>
            flag.segments.some((s) =>
              Object.values(a.segment).includes(s.key as any),
            ) ||
            run.reactions.some(
              (r) =>
                r.archetype_id === a.id &&
                r.variant_id === flag.variant_id &&
                r.backlash_category === flag.category &&
                r.backlash_risk > 0.04,
            ),
        )
        .map((a) => a.id),
    );
    fix = {
      flag_id: flag.id,
      variant_id: original.id,
      original: {
        headline: original.headline,
        copy: original.copy,
        visual: original.visual_description,
      },
      rewrite: {
        headline: rewrite.headline,
        copy: rewrite.copy,
        visual: rewrite.visual_description,
      },
      changes: rewrite.changes,
      self_check_new_risks: rewrite.self_check_new_risks,
      rounds: round,
      status: cleared ? "cleared" : "needs_human",
      rerun: {
        before: rr.before,
        after: rr.after,
        method: "rescored",
        archetypes_rescored: arcs.length,
        control_archetypes: arcs.filter((a) => !affected.has(a.id)).length,
      },
    };
    event(run, "fix", {
      flag_id: flag.id,
      round,
      status: fix.status,
      change_summary: rewrite.changes.join(" "),
    });
    previous = { rewrite, result: rr.after, remaining_flags: reviewed };
    if (cleared) break;
  }
  return fix!;
}
async function perform(run: Run) {
  const b = new Budget();
  b.shouldStop = () => run.cancelled;
  const c = run.campaign;
  try {
    stage(run, "Reading the brief", 0);
    await preflight();
    await guardrail(c, b);
    await storePut("runs", run.id, {
      campaign: c,
      user_id: run.owner_id,
      research: run.research,
      status: "running",
      mock: run.mock,
    });
    event(run, "brief", {
      variants: c.variants,
      channels: c.channels,
      location: c.location,
      timing: c.tools.calendar ? c.timing : "Calendar disabled",
      files: [],
    });
    stage(run, "Building the audience", 1);
    run.audience = await core<Audience>("/v1/audience", {
      campaign: { ...c, individual_agents: true },
      depth: c.depth,
      seed: c.seed,
    });
    const audience = run.audience;
    event(run, "audience", audience);
    stage(run, "Agents react", 2);
    const baselinePromise = structured(
      "baseline",
      BaselineModelSchema,
      prompt("single-call-baseline"),
      c,
      b,
      {
        mock: () => ({
          winner: c.variants[0].id,
          summary: `Variant ${c.variants[0].id} has a clear hook. Review the sensitive creative elements before launch.`,
          risks: c.variants.some((v) => v.copy.includes("270"))
            ? ["The 270 million figure needs verification."]
            : [],
          segment_notes: [
            "Young urban audiences may prefer the more direct hook.",
          ],
        }),
      },
    );
    await Promise.all(
      audience.archetypes.map(async (a) => {
        const rs = await Promise.all(c.variants.map((v) => react(c, a, v, b)));
        run.reactions.push(...rs);
        event(run, "reaction", {
          archetype_id: a.id,
          label: a.label,
          count: a.persona_count,
          comment: rs[0].sample_comment,
          per_variant: rs,
          running_count: run.reactions.length,
        });
      }),
    );
    if (b.failures > Math.max(2, run.reactions.length * 0.1))
      throw new Error(
        "Too many model calls failed. Retry with fewer variants or Quick depth.",
      );
    run.reactions.sort(
      (a, b) =>
        a.archetype_id.localeCompare(b.archetype_id) ||
        a.variant_id.localeCompare(b.variant_id),
    );
    const baseline = await baselinePromise;
    stage(run, "Simulating spread", 3);
    const sim = await core("/v1/simulate", {
      audience_id: audience.audience_id,
      seed: c.seed,
      reactions: run.reactions,
    });
    run.outcomes = sim.outcomes;
    for (const o of sim.outcomes) {
      let exposed = 0;
      for (let tick = 0; tick < o.ticks.length; tick++) {
        exposed += o.ticks[tick].length;
        event(run, "spread", {
          variant_id: o.variant_id,
          tick,
          newly_exposed: o.ticks[tick],
          edges: o.edges[tick],
          share_reached: exposed / audience.personas.count,
          objected_count: o.objected.reduce((a: number, b: number) => a + b, 0),
        });
      }
    }
    stage(run, "Rolling up results", 4);
    const aggregate = await core("/v1/aggregate", {
      audience_id: audience.audience_id,
    });
    for (const pv of aggregate.per_variant) {
      const v = c.variants.find((v) => v.id === pv.variant_id)!;
      pv.label = v.label;
      pv.trait = v.label;
    }
    const result: Result = {
      run_id: run.id,
      campaign_id: c.id,
      seed: c.seed,
      depth: c.depth,
      status: "running",
      personas_total: audience.personas.count,
      archetypes_total: audience.archetypes.length,
      llm_calls: 0,
      cache_hits: 0,
      failures: 0,
      ...aggregate,
      baseline: { ...baseline, missed: [], baseline_only: [] },
      risk_flags: [],
      fixes: [],
      insights: [],
      next_steps: [],
      translations: [],
    };
    run.result = result;
    event(run, "rollup", {
      per_variant: result.per_variant,
      overall: result.overall,
    });
    if (c.variants.length > 1) {
      const winner = c.variants.find((v) => v.id === result.overall.winner)!;
      const second = await Promise.all(
        audience.archetypes.map((a) => react(c, a, winner, b, 2)),
      );
      const robust = await core("/v1/robustness", {
        audience_id: audience.audience_id,
        reactions: second,
      });
      Object.assign(result.overall, robust);
      event(run, "robustness", robust);
    }
    if (c.tools.risk) {
      stage(run, "Risk and SARA scan", 5);
      result.risk_flags = await analyze(
        c,
        result,
        run.reactions,
        audience.archetypes,
        b,
      );
      for (const flag of result.risk_flags) event(run, "risk", flag);
    }
    recommendationGate(result);
    if (c.tools.risk && c.tools.rewrite) {
      stage(run, "Fix loop", 6);
      for (const flag of result.risk_flags.filter((f) => f.severity !== "low"))
        result.fixes.push(await fixFlag(run, flag, b));
    }
    const explained = await explain(result, b);
    result.ranking = result.ranking.map((row) => {
      const m = result.per_variant
        .find((v) => v.variant_id === row.winner)!
        .by_dimension[row.dimension].find((m) => m.group === row.group)!;
      return {
        ...row,
        why:
          m.n * m.reach < 20
            ? "Too few agents reached to call a winner."
            : result.per_variant.length > 1 &&
                row.margin < result.overall.robustness.noise_floor
              ? "Too close to call within the model noise floor."
              : explained.rows.find(
                  (x) => x.dimension === row.dimension && x.group === row.group,
                )?.why || "No explanation returned.",
      };
    });
    result.insights = explained.insights;
    result.next_steps = explained.next_steps;
    if (result.overall.recommendation_note)
      result.insights = [
        result.overall.recommendation_note,
        ...result.insights.slice(0, 3),
      ];
    const comparisonSchema = z.object({
      missed: z.array(z.string()),
      baseline_only: z.array(
        z.object({
          text: z.string(),
          status: z.enum(["not_supported", "not_tested"]),
        }),
      ),
    });
    const comparison = await structured(
      "baseline_comparison",
      comparisonSchema,
      "Compare the baseline with the actual simulation in both directions. Preserve all baseline concerns. Only name differences supported by the inputs. Claims of factual accuracy or legal validity are not tested. Empty lists are valid.",
      {
        baseline: result.baseline,
        per_variant: result.per_variant,
        overall: result.overall,
        risk_flags: result.risk_flags,
      },
      b,
      {
        mock: () => ({
          missed: [
            "Regional score margins and anger-driven reach are now quantified within the simulation.",
          ],
          baseline_only: baseline.risks.map((text) => ({
            text,
            status: "not_tested" as const,
          })),
        }),
      },
    );
    Object.assign(result.baseline, comparison);
    event(run, "baseline", result.baseline);
    result.translations = await translate(
      [
        ...c.variants.flatMap((v) => [v.headline, v.copy]),
        ...c.variants.flatMap((v) =>
          run.reactions
            .filter((r) => r.variant_id === v.id)
            .slice(0, 60)
            .map((r) => r.sample_comment),
        ),
        ...result.risk_flags.map((f) => f.evidence.comment),
        ...result.fixes.flatMap((f) => [
          f.original.headline,
          f.original.copy,
          f.rewrite.headline,
          f.rewrite.copy,
        ]),
      ],
      b,
    );
    telemetry(result, b);
    result.status = "done";
    run.result = ResultSchema.parse(result);
    run.status = "done";
    stage(run, "Dashboard ready", 7);
    event(run, "done", {
      result_id: run.id,
      pool: poolStatus(),
      estimated_usd: b.estimated_usd,
    });
    await save(run);
  } catch (e) {
    run.status = run.cancelled ? "cancelled" : "failed";
    run.error = e instanceof Error ? e.message : "Run failed";
    if (run.result) {
      telemetry(run.result, b);
      run.result.status = "failed";
    }
    run.events.push({
      run_id: run.id,
      seq: run.events.length + 1,
      time_ms: Date.now() - run.started,
      type: "error",
      data: {
        stage: run.events.filter((e) => e.type === "stage").at(-1)?.data.id,
        message: run.error,
        retryable: !run.cancelled,
      },
    });
    if (!run.owner_id || (await storeGet("users", run.owner_id)))
      await storePut("runs", run.id, {
        campaign: c,
        user_id: run.owner_id,
        research: run.research,
        status: run.status,
        error: run.error,
        mock: run.mock,
      }).catch(() => {});
  }
}
async function save(run: Run) {
  if (run.owner_id && !(await storeGet("users", run.owner_id)))
    throw new Error("Account removed");
  const previous = await storeGet("runs", run.id);
  await storePut("runs", run.id, {
    ...previous,
    campaign: run.campaign,
    user_id: run.owner_id,
    research: run.research,
    status: run.status,
    mock: run.mock,
  });
  await storePut("results", run.id, {
    result: run.result,
    audience: run.audience,
    reactions: run.reactions,
    outcomes: run.outcomes,
    mock: run.mock,
  });
  await storePut("recordings", run.id, { events: run.events, mock: run.mock });
}
export async function getRun(id: string): Promise<Run | null> {
  if (runs.has(id)) return runs.get(id)!;
  const saved = await storeGet("runs", id);
  if (!saved) return null;
  const r = await storeGet("results", id);
  const recording = await storeGet("recordings", id);
  if (saved.status === "running" && !r?.result) {
    saved.status = "failed";
    saved.error =
      "The server restarted before this run finished. Send the brief again; cached reactions will be reused.";
    await storePut("runs", id, saved);
  }
  return {
    id,
    campaign: saved.campaign,
    status: saved.status,
    error: saved.error,
    result: r?.result ?? null,
    audience: r?.audience,
    reactions: r?.reactions ?? [],
    outcomes: r?.outcomes ?? [],
    events: recording?.events ?? [],
    mock: saved.mock,
    replay: false,
    cancelled: false,
    started: Date.now(),
    owner_id: saved.user_id,
    research: saved.research,
  };
}
export async function getRunSummary(id: string) {
  const run = await getRun(id);
  if (!run) return null;
  return {
    id: run.id,
    status: run.status,
    error: run.error,
    stage: run.events.filter((e) => e.type === "stage").at(-1)?.data.id,
    reactions: run.reactions.length,
  };
}
export async function startRun(
  c: Campaign,
  owner_id?: string,
  research?: ExternalContext,
) {
  if (["1", "true"].includes(process.env.DEMO_CACHE ?? "")) {
    const { demos } = await import("../../contracts/src/demos");
    for (const [name, demo] of Object.entries(demos)) {
      if (
        c.brand === demo.brand &&
        JSON.stringify(c.variants) === JSON.stringify(demo.variants)
      ) {
        const recorded = await demoRecording(name);
        if (recorded) {
          const id = randomUUID();
          const replay = {
            ...recorded,
            owner_id,
            id,
            replay: true,
            cancelled: false,
            events: recorded.events.map((e) => ({ ...e, run_id: id })),
            result: { ...recorded.result!, run_id: id },
          };
          await storePut("runs", id, {
            campaign: c,
            user_id: owner_id,
            status: "done",
            mock: replay.mock,
          });
          runs.set(id, replay);
          await save(replay);
          return replay;
        }
      }
    }
    throw new Error(
      "No matching cached demo. Choose a recorded demo or disable DEMO_CACHE.",
    );
  }
  if (estimate(c).calls > Number(process.env.MAX_CALLS_PER_RUN || 16000))
    throw new Error(
      "Estimated worst-case calls exceed MAX_CALLS_PER_RUN. Reduce depth or disable automatic rewrites.",
    );
  if (c.variants.length > 3 && !(await core("/v1/health")).unlimited_directions)
    throw new Error(
      "The simulation service update is pending while existing runs finish. Your directions are saved; please retry shortly.",
    );
  const run: Run = {
    id: randomUUID(),
    campaign: c,
    events: [],
    result: null,
    reactions: [],
    outcomes: [],
    status: "running",
    mock: mockMode(),
    replay: false,
    cancelled: false,
    started: Date.now(),
    owner_id,
    research,
  };
  await storePut("runs", run.id, {
    campaign: c,
    user_id: owner_id,
    research,
    status: "running",
    mock: run.mock,
  });
  runs.set(run.id, run);
  void perform(run);
  return run;
}
export async function cancelRun(id: string) {
  const r = runs.get(id);
  if (r) {
    r.cancelled = true;
    r.status = "cancelled";
  }
  return r;
}
export async function refix(id: string, flagId: string) {
  const r = await getRun(id);
  if (!r?.result || !r.audience) throw new Error("Completed result required");
  const flag = r.result.risk_flags.find((f) => f.id === flagId);
  if (!flag) throw new Error("Unknown flag");
  const fresh = await core<Audience>("/v1/audience", {
    campaign: {
      ...r.campaign,
      individual_agents:
        r.audience.archetypes.length === r.audience.personas.count,
    },
    depth: r.campaign.depth,
    seed: r.campaign.seed,
  });
  r.audience = fresh;
  await core("/v1/simulate", {
    audience_id: fresh.audience_id,
    reactions: r.reactions,
  });
  const fix = await fixFlag(r, flag, new Budget());
  r.result.fixes = [
    ...r.result.fixes.filter((f) => f.flag_id !== flag.id),
    fix,
  ];
  await save(r);
  return r;
}
export async function demoRecording(name: string) {
  if (!/^[a-z-]+$/.test(name)) return null;
  try {
    return JSON.parse(
      await readFile(resolve(root(), `recordings/${name}.json`), "utf8"),
    ) as Run;
  } catch {
    return null;
  }
}
export async function exportRecording(id: string, name: string) {
  const r = await getRun(id);
  if (!r || r.status !== "done")
    throw new Error("Run must finish before recording");
  await mkdir(resolve(root(), "recordings"), { recursive: true });
  await writeFile(
    resolve(root(), `recordings/${name}.json`),
    JSON.stringify({ ...r, replay: true }),
  );
}

export function cancelOwnedRuns(userId: string) {
  for (const r of runs.values())
    if (r.owner_id === userId && r.status === "running") {
      r.cancelled = true;
      r.status = "cancelled";
    }
}
