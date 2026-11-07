"use client";
import { readJson, requestTask } from "../lib/http";
import { useState } from "react";
import {
  type Campaign,
  type Result,
  type Reaction,
  type Audience,
} from "@alice/contracts";
import { dimensions, regions, pretty, directionColor } from "../lib/display";
import Map from "./Map";
import ResearchCard from "./ResearchCard";
import type { ExternalContext } from "@alice/agents";
import ArtifactWorkspace from "./ArtifactWorkspace";
import dynamic from "next/dynamic";
const AgentNetwork = dynamic(() => import("./AgentNetwork"));
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const score = (v: number) => v.toFixed(1);
const vc = directionColor;
export default function Dashboard({
  run,
  onReplay,
  onAccept,
  onUpdate,
  onDraft,
  onConversation,
}: {
  run: {
    research?: ExternalContext;
    id: string;
    campaign: Campaign;
    result: Result;
    reactions: Reaction[];
    audience?: Audience;
    outcomes: any[];
    mock: boolean;
    replay: boolean;
  };
  onReplay: () => void;
  onAccept: (f: Result["fixes"][number]) => void;
  onUpdate: (r: any) => void;
  onDraft: (c: Campaign) => void;
  onConversation?: (m: { role: string; text: string }[]) => void;
}) {
  const [tab, setTab] = useState("Overview");
  const [variant, setVariant] = useState(run.campaign.variants[0].id);
  const [metric, setMetric] = useState("score");
  const [region, setRegion] = useState("");
  const [dimension, setDimension] =
    useState<(typeof dimensions)[number]>("region");
  const [english, setEnglish] = useState(true);
  const [filter, setFilter] = useState("All");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const r = run.result,
    c = run.campaign;
  const winner = r.per_variant.find(
    (v) => v.variant_id === r.overall.recommended,
  );
  const top = r.per_variant.find((v) => v.variant_id === r.overall.winner)!;
  const single = c.variants.length === 1;
  const tabs = [
    "Overview",
    "Reaction map",
    "Timeline",
    "Evidence",
    "Agent network",
    single ? "Segments" : "Direction ranking",
    ...(c.tools.risk ? ["Risk flags"] : []),
    ...(c.tools.risk && c.tools.rewrite ? ["Fixes"] : []),
    "Agent feed",
  ];
  const en = (s: string) =>
    english ? (
      <small className="translation">
        {r.translations.find((t) => t.source === s)?.english ??
          "English translation unavailable"}
      </small>
    ) : null;
  const rows =
    r.per_variant.find((v) => v.variant_id === variant)?.by_dimension.region ??
    [];
  const selected = rows.find((g) => g.group === region);
  return (
    <div className="dashboard enter">
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">Your campaign, through their eyes</span>
          <h1>{c.brand}</h1>
          <div className="tags">
            <span>{r.personas_total.toLocaleString()} agents</span>
            <span>{pretty(c.depth)}</span>
            <span>
              {run.audience?.archetypes.every((a) => a.persona_count === 1)
                ? "Individual-personality simulation"
                : `${r.archetypes_total} shared archetypes`}
            </span>
            <span>Seed {c.seed}</span>
            {run.mock && <span className="warn">Mock data</span>}
            {run.replay && <span>Cached replay</span>}
            <span>
              {r.llm_calls} calls · {r.cache_hits} cache hits
            </span>
          </div>
        </div>
        <div className="actions">
          <button onClick={() => setEnglish(!english)} aria-pressed={english}>
            English {english ? "on" : "off"}
          </button>
          <button onClick={() => window.print()}>Export PDF ↗</button>
        </div>
      </div>
      <nav className="tabs">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={tab === t ? "selected" : ""}
          >
            {t}
            {t === "Risk flags" && r.risk_flags.length > 0 && (
              <span className="count">{r.risk_flags.length}</span>
            )}
          </button>
        ))}
      </nav>
      {tab === "Evidence" &&
        (run.research ? (
          <ResearchCard context={run.research} expanded />
        ) : (
          <section className="panel">
            <h2>No external research saved for this campaign.</h2>
            <p className="muted">
              Enable External research in Tools when planning a new campaign to
              save dated sources with its results.
            </p>
          </section>
        ))}
      {tab === "Timeline" && (
        <ArtifactWorkspace
          run={run}
          mode="timeline"
          onDraft={onDraft}
          onConversation={onConversation}
        />
      )}
      {tab === "Agent network" && <AgentNetwork run={run} />}
      {tab === "Overview" && (
        <>
          <div className="winner-banner">
            <div className="winner-symbol">
              {r.overall.is_tie && !single ? "≈" : "↗"}
            </div>
            <div>
              <span className="eyebrow">
                {r.overall.confidence} confidence · directional simulation
              </span>
              <h2>
                {single
                  ? `Simulated impact: ${score(top.overall.score)} / 100`
                  : r.overall.is_tie
                    ? "Too close to call"
                    : winner
                      ? `Recommended: ${winner.variant_id}, ${winner.label}`
                      : "Review required before launch"}
              </h2>
              <p>
                {r.overall.is_tie && !single
                  ? `The ${score(r.overall.margin)} point lead sits within the ${score(r.overall.robustness.noise_floor)} point model noise floor.`
                  : single
                    ? "Explore where the campaign lands and where it needs care."
                    : `${winner?.variant_id ?? top.variant_id} leads in the combined simulated score. The top scorer leads in ${r.overall.regions_won} of seven regions, by ${score(r.overall.margin)} points overall.`}
              </p>
              {r.overall.recommendation_note && (
                <p className="bad">! {r.overall.recommendation_note}</p>
              )}
            </div>
            <button onClick={() => setTab("Reaction map")}>
              Explore the map ↗
            </button>
          </div>
          {!single && (
            <details className="robustness">
              <summary>
                <span>◈ Robustness</span> Audience{" "}
                {r.overall.robustness.audience_won} /{" "}
                {r.overall.robustness.audience_total}
                <i /> Constants {r.overall.robustness.constants_won} /{" "}
                {r.overall.robustness.constants_total}
                <i /> Noise floor {score(
                  r.overall.robustness.noise_floor,
                )} pts <span>⌄</span>
              </summary>
              <p>
                Audience: resamples archetypes with replacement. Constants:
                moves five simulation parameters up and down. Noise floor: asks
                the model again for the top scorer on the same audience. These
                checks measure stability of this simulation, not real-world
                accuracy.
              </p>
            </details>
          )}
          <div className="overview-grid">
            <section className="panel map-preview">
              <div className="panel-heading">
                <h3>Every region has a different story.</h3>
                <button
                  className="text-button"
                  onClick={() => setTab("Reaction map")}
                >
                  Explore ↗
                </button>
              </div>
              <Map result={r} variant={winner?.variant_id ?? top.variant_id} />
              <div className="legend">
                <span className="bad">■ Lower impact</span>
                <span className="warn">■ Moderate</span>
                <span className="good">■ Higher impact</span>
              </div>
            </section>
            <section className="panel">
              <h3>The comparison ledger</h3>
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    {r.per_variant.map((v) => (
                      <th key={v.variant_id}>
                        <span style={{ color: vc(v.variant_id) }}>
                          {v.variant_id} · {v.label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      "score",
                      "reach",
                      "sentiment",
                      "engagement",
                      "backlash",
                      "anger_reach",
                    ] as const
                  ).map((key) => (
                    <tr key={key}>
                      <td>
                        {(
                          {
                            score: "Impact score",
                            anger_reach: "Reach from anger",
                          } as any
                        )[key] ?? pretty(key)}
                      </td>
                      {r.per_variant.map((v) => (
                        <td key={v.variant_id}>
                          {key === "score"
                            ? score(v.overall[key])
                            : key === "sentiment"
                              ? v.overall[key].toFixed(2)
                              : pct(v.overall[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="footnote">
                Same seed and audience for every variant. Scores summarize the
                simulation.
              </p>
            </section>
          </div>
          <section className="panel baseline">
            <div className="panel-heading">
              <h3>One call versus Alice</h3>
              <span className="tag">An honest comparison</span>
            </div>
            <div className="two-col">
              <div>
                <span className="eyebrow">A single model call</span>
                <h4>Variant {r.baseline.winner}</h4>
                <p>{r.baseline.summary}</p>
                {r.baseline.risks.map((t) => (
                  <p key={t} className="muted">
                    ↳ {t}
                  </p>
                ))}
              </div>
              <div>
                <span className="eyebrow">What the simulation adds</span>
                {r.baseline.missed.length ? (
                  r.baseline.missed.map((t) => <p key={t}>↳ {t}</p>)
                ) : (
                  <p>No additional findings surfaced.</p>
                )}
                <h4>What the single call raised that Alice didn’t</h4>
                {r.baseline.baseline_only.length ? (
                  r.baseline.baseline_only.map((t, i) => (
                    <p key={i}>
                      {t.text}{" "}
                      <span className="tag">
                        {t.status === "not_tested"
                          ? "Not something Alice simulates"
                          : "Not backed by the simulation"}
                      </span>
                    </p>
                  ))
                ) : (
                  <p className="muted">No unmatched concerns.</p>
                )}
              </div>
            </div>
          </section>
          <div className="two-col">
            <section className="panel">
              <h3>How each direction spreads</h3>
              <SpreadChart outcomes={run.outcomes} total={r.personas_total} />
            </section>
            <section className="panel">
              <h3>What to know</h3>
              {r.insights.map((t, i) => (
                <p key={i} className="insight">
                  <span>0{i + 1}</span>
                  {t}
                </p>
              ))}
              <h4>Next steps</h4>
              {r.next_steps.map((t) => (
                <p key={t} className="muted">
                  ↗ {t}
                </p>
              ))}
            </section>
          </div>
        </>
      )}
      {tab === "Reaction map" && (
        <>
          <div className="control-row">
            <div className="segmented">
              {r.per_variant.map((v) => (
                <button
                  className={variant === v.variant_id ? "active" : ""}
                  onClick={() => setVariant(v.variant_id)}
                  key={v.variant_id}
                >
                  {v.variant_id} · {v.label}
                </button>
              ))}
            </div>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
              aria-label="Map metric"
            >
              {["score", "reach", "sentiment", "backlash"].map((m) => (
                <option key={m} value={m}>
                  {m === "score" ? "Impact score" : pretty(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="map-detail-grid">
            <section className="panel map-large">
              <Map
                result={r}
                variant={variant}
                metric={metric}
                selected={region}
                onSelect={setRegion}
              />
              <div className="legend">
                {metric === "backlash"
                  ? "Coral indicates more backlash."
                  : "Coral → gold → green indicates lower to higher."}{" "}
                Select a region for its audience story.
              </div>
            </section>
            <section className="panel region-panel">
              <span className="eyebrow">
                {selected ? "Regional detail" : "Across the archipelago"}
              </span>
              <h2>
                {selected
                  ? pretty(region)
                  : "Seven regions. Many perspectives."}
              </h2>
              {selected ? (
                <>
                  <p>{pct(selected.share)} of the sampled online audience</p>
                  {r.per_variant.map((v) => {
                    const m = v.by_dimension.region.find(
                      (g) => g.group === region,
                    )!;
                    return (
                      <ScoreBar
                        key={v.variant_id}
                        id={v.variant_id}
                        label={v.label}
                        value={m.score}
                      />
                    );
                  })}
                  <div className="metric-trio">
                    <div>
                      <strong>{pct(selected.reach)}</strong>Reach
                    </div>
                    <div>
                      <strong>{selected.sentiment.toFixed(2)}</strong>Sentiment
                    </div>
                    <div>
                      <strong>{pct(selected.backlash)}</strong>Backlash
                    </div>
                  </div>
                  <h4>Simulated voices</h4>
                  {run.reactions
                    .filter(
                      (x) =>
                        x.variant_id === variant &&
                        run.audience?.archetypes.find(
                          (a) => a.id === x.archetype_id,
                        )?.segment.region === region,
                    )
                    .slice(0, 2)
                    .map((x, i) => (
                      <blockquote key={i}>
                        {x.sample_comment}
                        {en(x.sample_comment)}
                      </blockquote>
                    ))}
                </>
              ) : (
                rows
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((m, i) => (
                    <button
                      className="region-row"
                      key={m.group}
                      onClick={() => setRegion(m.group)}
                    >
                      <span>
                        <small>0{i + 1}</small>
                        {pretty(m.group)}
                      </span>
                      <strong>{score(m.score)} ↗</strong>
                    </button>
                  ))
              )}
            </section>
          </div>
        </>
      )}
      {(tab === "Direction ranking" || tab === "Segments") && (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Where each campaign connects.</h2>
              <p className="muted">
                Explore the differences behind the overall score.
              </p>
            </div>
            <select
              aria-label="Segment dimension"
              value={dimension}
              onChange={(e) => setDimension(e.target.value as any)}
            >
              {dimensions.map((d) => (
                <option key={d} value={d}>
                  {pretty(d)}
                </option>
              ))}
            </select>
          </div>
          <div className="ranking-table">
            {r.ranking
              .filter((row) => row.dimension === dimension)
              .map((row) => {
                const m = r.per_variant[0].by_dimension[dimension].find(
                  (g) => g.group === row.group,
                )!;
                const few = m.n * m.reach < 20;
                return (
                  <details key={row.group}>
                    <summary>
                      <div>
                        <h4>{pretty(row.group)}</h4>
                        <small>
                          {pct(m.share)} of audience{" "}
                          {m.share < 0.03 ? "· noisy" : ""}{" "}
                          {few ? "· few reached" : ""}
                        </small>
                      </div>
                      <div className="segment-scores">
                        {r.per_variant.map((v) => (
                          <ScoreBar
                            id={v.variant_id}
                            label={v.variant_id}
                            key={v.variant_id}
                            value={
                              v.by_dimension[dimension].find(
                                (g) => g.group === row.group,
                              )!.score
                            }
                          />
                        ))}
                      </div>
                      <span className="tag">
                        {few
                          ? "Too few reached"
                          : single
                            ? m.score > 65
                              ? "Strong spot"
                              : m.score > 45
                                ? "Average"
                                : "Weak spot"
                            : row.margin < r.overall.robustness.noise_floor
                              ? "Close call"
                              : `${row.winner} leads · ${score(row.margin)} pts`}
                      </span>
                      <span>⌄</span>
                    </summary>
                    <p>{row.why}</p>
                  </details>
                );
              })}
          </div>
          <p className="footnote">
            Segments under 3% are noisy. Groups with fewer than 20 reached
            agents do not get a winner.
          </p>
        </section>
      )}
      {tab === "Risk flags" && (
        <>
          <div className="section-intro">
            <h2>Find the friction before launch.</h2>
            <p>
              Grounded in synthetic comments and segment backlash. Sensitive
              concepts are signals for review.
            </p>
          </div>
          {!r.risk_flags.length ? (
            <section className="panel empty-panel">
              <span className="good">✓</span>
              <h2>No major risks surfaced.</h2>
              <p>A simulation cannot replace cultural and legal review.</p>
            </section>
          ) : (
            r.risk_flags.map((f) => (
              <section key={f.id} className="panel risk-card">
                <div className="tags">
                  <span className={f.severity === "high" ? "bad" : "warn"}>
                    ! {pretty(f.severity)} severity
                  </span>
                  <span>{pretty(f.category)}</span>
                  <span>Variant {f.variant_id}</span>
                </div>
                <h2>{f.title}</h2>
                <p>{f.explanation}</p>
                <div className="tags">
                  {f.segments.map((s) => (
                    <span key={s.key}>
                      {pretty(s.key)} · {pct(s.backlash)} backlash
                    </span>
                  ))}
                </div>
                <blockquote>
                  {f.evidence.comment}
                  {en(f.evidence.comment)}
                  <small>
                    {f.evidence.persona_tags.join(" · ")} · synthetic reaction
                  </small>
                </blockquote>
                <div className="panel-heading">
                  <p className="muted">{f.suggested_fix_direction}</p>
                  {c.tools.rewrite && (
                    <button onClick={() => setTab("Fixes")}>
                      See the fix ↗
                    </button>
                  )}
                </div>
              </section>
            ))
          )}
        </>
      )}
      {tab === "Fixes" && (
        <>
          <div className="section-intro">
            <h2>A second draft. An honest second test.</h2>
            <p>
              Original campaigns stay intact. Accepting a rewrite starts a new
              draft for you to review.
            </p>
          </div>
          {!r.fixes.length && (
            <section className="panel empty-panel">
              <h2>Nothing needs an automatic rewrite.</h2>
              <p>
                Consider a localized test where the other direction performs
                better.
              </p>
            </section>
          )}
          {error && (
            <p role="alert" className="error">
              ! {error}
            </p>
          )}
          {r.fixes.map((f) => (
            <section className="panel" key={f.flag_id}>
              <div className="panel-heading">
                <h3>
                  Variant {f.variant_id} ·{" "}
                  {r.risk_flags.find((x) => x.id === f.flag_id)?.title}
                </h3>
                <span
                  className={f.status === "cleared" ? "good tag" : "warn tag"}
                >
                  {f.status === "cleared"
                    ? "✓ Cleared in rerun"
                    : "! Needs a person"}{" "}
                  · {f.rounds} round{f.rounds > 1 ? "s" : ""}
                </span>
              </div>
              <div className="two-col rewrite-grid">
                <div>
                  <span className="eyebrow">Original</span>
                  <h3>{f.original.headline}</h3>
                  {en(f.original.headline)}
                  <p>{f.original.copy}</p>
                  {en(f.original.copy)}
                  <p className="muted">Visual: {f.original.visual}</p>
                </div>
                <div>
                  <span className="eyebrow">Suggested rewrite</span>
                  <h3>{f.rewrite.headline}</h3>
                  {en(f.rewrite.headline)}
                  <p>{f.rewrite.copy}</p>
                  {en(f.rewrite.copy)}
                  <p className="muted">Visual: {f.rewrite.visual}</p>
                </div>
              </div>
              {f.changes.map((t) => (
                <p key={t}>↳ {t}</p>
              ))}
              {f.rerun && (
                <>
                  <div className="metric-trio rerun">
                    <div>
                      <strong>
                        {score(f.rerun.before.score)} →{" "}
                        {score(f.rerun.after.score)}
                      </strong>
                      Impact score
                    </div>
                    <div>
                      <strong>
                        {pct(f.rerun.before.backlash)} →{" "}
                        {pct(f.rerun.after.backlash)}
                      </strong>
                      Backlash
                    </div>
                    <div>
                      <strong>
                        {f.rerun.before.sentiment.toFixed(2)} →{" "}
                        {f.rerun.after.sentiment.toFixed(2)}
                      </strong>
                      Sentiment
                    </div>
                  </div>
                  <p className="footnote">
                    {run.mock
                      ? "Mock rerun · not verified"
                      : f.rerun.method === "rescored"
                        ? "Verified with new model reactions"
                        : "What-if estimate · not verified"}{" "}
                    · Same seed and audience · {f.rerun.archetypes_rescored}{" "}
                    archetypes rescored, including {f.rerun.control_archetypes}{" "}
                    unaffected controls.
                  </p>
                  {f.rerun.after.score < f.rerun.before.score && (
                    <p className="warn">
                      ! This fix lowered the impact score. That tradeoff is part
                      of the result.
                    </p>
                  )}
                </>
              )}
              <div className="actions">
                <button className="primary" onClick={() => onAccept(f)}>
                  Use as a new draft
                </button>
                <button
                  disabled={!!busy}
                  onClick={async () => {
                    setBusy(f.flag_id);
                    setError("");
                    try {
                      const response = await fetch(`/api/runs/${run.id}/fix`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ flag_id: f.flag_id }),
                      });
                      const next = await readJson(response);
                      if (!response.ok) throw new Error(next.error);
                      onUpdate(next);
                    } catch (e) {
                      setError(String(e));
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === f.flag_id ? "Re-running…" : "Run fix loop again"}
                </button>
              </div>
            </section>
          ))}
        </>
      )}
      {tab === "Agent feed" && (
        <>
          <div className="panel-heading">
            <div>
              <h2>Listen to the simulated conversation.</h2>
              <p className="muted">
                Synthetic voices, never real people’s opinions.
              </p>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="Reaction filter"
            >
              {["All", "Positive", "Negative", "Backlash"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              aria-label="Feed variant"
            >
              {r.per_variant.map((v) => (
                <option key={v.variant_id} value={v.variant_id}>
                  Variant {v.variant_id}
                </option>
              ))}
            </select>
          </div>
          <div className="feed-grid">
            {run.reactions
              .filter(
                (x) =>
                  x.variant_id === variant &&
                  (filter === "All" ||
                    (filter === "Positive" && x.sentiment > 0) ||
                    (filter === "Negative" && x.sentiment < 0) ||
                    (filter === "Backlash" && x.backlash_risk > 0.15)),
              )
              .slice(0, 60)
              .map((x, i) => {
                const a = run.audience?.archetypes.find(
                  (a) => a.id === x.archetype_id,
                );
                return (
                  <section className="panel feed-card" key={i}>
                    <div className="panel-heading">
                      <span className="avatar">
                        {a?.segment.platform.slice(0, 2).toUpperCase()}
                      </span>
                      <span
                        className={x.backlash_risk > 0.15 ? "bad tag" : "tag"}
                      >
                        {x.backlash_risk > 0.15
                          ? "! Likely to object"
                          : x.sentiment > 0
                            ? "Positive"
                            : "Negative"}
                      </span>
                    </div>
                    <blockquote>
                      {x.sample_comment}
                      {en(x.sample_comment)}
                    </blockquote>
                    <p className="muted">{a?.label}</p>
                    <div className="tags">
                      <span>{a?.segment.age_band}</span>
                      <span>{pretty(a?.segment.region ?? "")}</span>
                      <span>{a?.segment.platform}</span>
                    </div>
                  </section>
                );
              })}
          </div>
        </>
      )}
      <ArtifactWorkspace
        run={run}
        mode="chat"
        onDraft={onDraft}
        onConversation={onConversation}
      />
      <footer className="dashboard-footer">
        Alice simulates audiences. Treat results as directional, not a forecast.{" "}
        <button className="text-button" onClick={onReplay}>
          ↺ Replay simulation
        </button>
      </footer>
    </div>
  );
}
function ScoreBar({
  id,
  label,
  value,
}: {
  id: string;
  label: string;
  value: number;
}) {
  return (
    <div className="score-bar">
      <span style={{ color: vc(id) }}>{label}</span>
      <div>
        <i style={{ width: `${value}%`, background: vc(id) }} />
      </div>
      <strong>{score(value)}</strong>
    </div>
  );
}
function SpreadChart({ outcomes, total }: { outcomes: any[]; total: number }) {
  return (
    <div className="spread-chart">
      <svg
        viewBox="0 0 460 180"
        role="img"
        aria-label="Cumulative simulated reach across eight spread ticks"
      >
        {[0.25, 0.5, 0.75, 1].map((y) => (
          <g key={y}>
            <line
              x1="30"
              x2="450"
              y1={160 - y * 140}
              y2={160 - y * 140}
              stroke="var(--line)"
            />
            <text x="0" y={164 - y * 140} fill="var(--muted)" fontSize="10">
              {y * 100}%
            </text>
          </g>
        ))}
        {outcomes.map((o: any) => {
          let sum = 0;
          return (
            <polyline
              key={o.variant_id}
              points={o.ticks
                .map((t: any, i: number) => {
                  sum += t.length;
                  return `${30 + i * 52.5},${160 - (sum / total) * 140}`;
                })
                .join(" ")}
              fill="none"
              stroke={vc(o.variant_id)}
              strokeWidth="2.5"
            />
          );
        })}
        <text x="30" y="178" fill="var(--muted)" fontSize="10">
          Initial exposure
        </text>
        <text x="420" y="178" fill="var(--muted)" fontSize="10">
          Tick 8
        </text>
      </svg>
      <div className="legend">
        {outcomes.map((o) => (
          <span key={o.variant_id} style={{ color: vc(o.variant_id) }}>
            ━ Variant {o.variant_id}
          </span>
        ))}
      </div>
    </div>
  );
}
