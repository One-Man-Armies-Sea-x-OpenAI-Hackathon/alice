"use client";
import { useEffect, useRef, useState } from "react";
import type { Campaign, Result } from "@alice/contracts";
import type { Artifact, Scenario } from "../../../packages/agents/src/artifact";
import { pretty } from "../lib/display";
import { holywingsCase } from "../lib/history-case";
const empty = (): Artifact => ({
  revision: 1,
  messages: [],
  charts: [],
  scenario: {
    start_date: new Date().toISOString().slice(0, 10),
    days: 30,
    daily_exposure: 0.04,
    organic_multiplier: 1,
    sentiment_decay: 0.01,
  },
});
export default function ArtifactWorkspace({
  run,
  mode = "chat",
  onDraft,
  onConversation,
}: {
  run: { id: string; campaign: Campaign; result: Result };
  mode?: "chat" | "timeline" | "evidence";
  onDraft: (c: Campaign) => void;
  onConversation?: (messages: { role: string; text: string }[]) => void;
}) {
  const [artifact, setArtifact] = useState<Artifact>(empty);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scenario, setScenario] = useState<any>(null);
  const [granularity, setGranularity] = useState("day");
  const [metric, setMetric] = useState("reach");
  const [assumptions, setAssumptions] = useState<Scenario>(empty().scenario);
  const [ready, setReady] = useState(false);
  const [historicalCheck, setHistoricalCheck] = useState<any>(null);
  useEffect(() => {
    if (mode !== "evidence") return;
    fetch("/api/evidence/holywings")
      .then((r) => (r.ok ? r.json() : null))
      .then(setHistoricalCheck)
      .catch(() => {});
  }, [mode]);
  const thread = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setReady(false);
    fetch(`/api/runs/${run.id}/discuss`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error);
        return body;
      })
      .then((a) => {
        setArtifact(a);
        setAssumptions(a.scenario);
        setReady(true);
      })
      .catch((e) => setError(e.message));
  }, [run.id]);
  useEffect(() => {
    thread.current?.scrollTo({ top: thread.current.scrollHeight });
  }, [artifact.messages.length]);
  async function ask(e?: React.FormEvent, question = text) {
    e?.preventDefault();
    if (!question.trim()) return;
    setBusy(true);
    setError("");
    setText("");
    const pendingId = crypto.randomUUID();
    setArtifact((a) => ({
      ...a,
      messages: [
        ...a.messages,
        {
          id: pendingId,
          role: "user",
          text: question,
          created: new Date().toISOString(),
        },
      ],
    }));
    try {
      const r = await fetch(`/api/runs/${run.id}/discuss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: question }),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setArtifact(body.artifact);
      setAssumptions(body.artifact.scenario);
      setText("");
      onConversation?.(
        body.artifact.messages.map((m: any) => ({
          role: m.role,
          text: m.text,
        })),
      );
      if (body.draft) onDraft(body.draft);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function calculate(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch(`/api/runs/${run.id}/scenario`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assumptions),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setScenario(body);
      setArtifact((a) => ({
        ...a,
        scenario: assumptions,
        revision: body.revision,
      }));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  if (mode === "evidence")
    return (
      <section className="panel evidence-case">
        <span className="eyebrow">{holywingsCase.status}</span>
        <h2>{holywingsCase.title}</h2>
        <p>
          Compare a pre-launch simulation with the documented record. These
          sources establish events and objections, not a representative
          sentiment percentage.
        </p>
        {holywingsCase.facts.map((f) => (
          <article key={f.date}>
            <time>{f.date}</time>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
            <a href={f.url} target="_blank" rel="noreferrer">
              {f.source} ↗
            </a>
          </article>
        ))}
        {historicalCheck && (
          <section className="added-chart">
            <h3>Qualitative model check</h3>
            <p>
              {historicalCheck.recognized} of {historicalCheck.sample_size}{" "}
              separate {historicalCheck.model} judgments identified religious
              sensitivity.
            </p>
            <small>{historicalCheck.interpretation}</small>
          </section>
        )}
        {/holywings/i.test(run.campaign.brand) ? (
          <section className="added-chart">
            <h3>This run compared with the record</h3>
            <p>
              {run.result.risk_flags.some((f) => f.category === "sara_religion")
                ? "✓ The analyst identified a religious-sensitivity issue."
                : "! The analyst did not identify a religious-sensitivity issue. Treat this mismatch as a limitation."}
            </p>
            <p>
              {run.result.risk_flags.some((f) => f.severity === "high")
                ? `Recommendation gate: ${run.result.overall.recommended === null ? "launch blocked pending review" : "an alternative remains eligible"}.`
                : "No high-severity flag surfaced in this run."}
            </p>
          </section>
        ) : (
          <p className="muted">
            This result is for another campaign. The Holywings record is shown
            as a reference case.
          </p>
        )}
        <h3>What we can check</h3>
        {holywingsCase.checks.map((t) => (
          <p key={t}>↳ {t}</p>
        ))}
        <h3>What the record does not establish</h3>
        {holywingsCase.notEstablished.map((t) => (
          <p className="muted" key={t}>
            — {t}
          </p>
        ))}
        <p className="footnote">
          Historical outcomes are held apart from persona reaction prompts. The
          foundation model may still know the event; this is not a blind
          held-out validation.
        </p>
        <button
          onClick={() =>
            onDraft({
              ...run.campaign,
              id: crypto.randomUUID(),
              brand: "Holywings",
              notes: holywingsCase.brief,
              timing: "22 June 2022",
              channels: ["instagram"],
              location: "Indonesia",
              target_regions: [],
              outdoor_regions: [],
              variants: [
                {
                  id: "A",
                  label: "Original promotion",
                  headline: "Promo untuk pemilik nama Muhammad dan Maria",
                  copy: "Minuman beralkohol gratis untuk pelanggan dewasa dengan nama Muhammad atau Maria.",
                  visual_description:
                    "Instagram promotion with names alongside alcohol.",
                  attachment_ids: [],
                  ai_drafted: false,
                },
              ],
            })
          }
        >
          Prepare a pre-launch assessment
        </button>
      </section>
    );
  if (mode === "timeline") {
    const points = scenario?.points ?? [];
    const dates = points.map((p: any) => ({
      ...p,
      date: new Date(
        Date.parse(assumptions.start_date + "T00:00:00Z") +
          (p.day - 1) * 86400000,
      )
        .toISOString()
        .slice(0, 10),
    }));
    const monthly = new Map<string, any>();
    for (const p of dates) {
      const key = `${p.date.slice(0, 7)}-${p.variant_id}`;
      const old = monthly.get(key);
      monthly.set(key, {
        ...p,
        date: p.date.slice(0, 7),
        new_reach: (old?.new_reach ?? 0) + p.new_reach,
      });
    }
    const shown = granularity === "month" ? [...monthly.values()] : dates;
    return (
      <section className="panel scenario-panel">
        <span className="eyebrow">
          Artifact revision {artifact.revision} · hypothetical scenario
        </span>
        <h2>A timeline with visible assumptions.</h2>
        <p>
          Days represent assumed exposure opportunities, not a calibrated
          duration for the original spread ticks. Monthly reach is the month-end
          total; new reach is summed within the month.
        </p>
        <form className="assumption-grid" onSubmit={calculate}>
          <label>
            Start date
            <input
              type="date"
              value={assumptions.start_date}
              onChange={(e) =>
                setAssumptions({ ...assumptions, start_date: e.target.value })
              }
              required
            />
          </label>
          <label>
            Duration (days)
            <input
              type="number"
              min={1}
              max={180}
              value={assumptions.days}
              onChange={(e) =>
                setAssumptions({ ...assumptions, days: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Daily exposure opportunity (%)
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={assumptions.daily_exposure * 100}
              onChange={(e) =>
                setAssumptions({
                  ...assumptions,
                  daily_exposure: Number(e.target.value) / 100,
                })
              }
            />
          </label>
          <label>
            Organic sharing multiplier
            <input
              type="number"
              min={0}
              max={3}
              step={0.1}
              value={assumptions.organic_multiplier}
              onChange={(e) =>
                setAssumptions({
                  ...assumptions,
                  organic_multiplier: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            Daily sentiment decay (%)
            <input
              type="number"
              min={0}
              max={20}
              step={0.1}
              value={assumptions.sentiment_decay * 100}
              onChange={(e) =>
                setAssumptions({
                  ...assumptions,
                  sentiment_decay: Number(e.target.value) / 100,
                })
              }
            />
          </label>
          <button disabled={busy || !ready} className="primary">
            {busy ? "Calculating…" : "Update scenario"}
          </button>
        </form>
        <div className="control-row">
          <div className="segmented">
            <button
              onClick={() => setGranularity("day")}
              className={granularity === "day" ? "active" : ""}
            >
              Day by day
            </button>
            <button
              onClick={() => setGranularity("month")}
              className={granularity === "month" ? "active" : ""}
            >
              Monthly roll-up
            </button>
          </div>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            aria-label="Timeline metric"
          >
            {["reach", "new_reach", "sentiment", "score", "backlash"].map(
              (m) => (
                <option value={m} key={m}>
                  {pretty(m)}
                </option>
              ),
            )}
          </select>
        </div>
        {!scenario ? (
          <p className="muted">
            Choose assumptions and update the scenario. This calculation makes
            no model calls.
          </p>
        ) : (
          <>
            <TimelinePlot points={shown} metric={metric} />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{granularity === "day" ? "Date" : "Month"}</th>
                    <th>Variant</th>
                    <th>Cumulative reach</th>
                    <th>New reach</th>
                    <th>Sentiment</th>
                    <th>Impact / 100</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p: any) => (
                    <tr key={`${p.date}-${p.variant_id}`}>
                      <td>{p.date}</td>
                      <td>{p.variant_id}</td>
                      <td>{(p.reach * 100).toFixed(1)}%</td>
                      <td>{(p.new_reach * 100).toFixed(1)}%</td>
                      <td>{p.sentiment.toFixed(2)}</td>
                      <td>{p.score.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="footnote">{scenario.note}</p>
          </>
        )}
        {error && (
          <p role="alert" className="bad">
            ! {error}
          </p>
        )}
      </section>
    );
  }
  return (
    <section id="artifact-conversation" className="panel artifact-conversation">
      <div className="panel-heading">
        <div>
          <h3>Continue with Alice</h3>
          <small>
            Dashboard artifact · revision {artifact.revision}. Charts update
            here; changed campaigns require fresh reactions.
          </small>
        </div>
        <span className="tag">Private conversation</span>
      </div>
      <div ref={thread} className="artifact-thread" aria-live="polite">
        {!artifact.messages.length && (
          <p className="muted">
            Ask why a direction leads, request an age or platform chart, or
            describe a change to your campaign.
          </p>
        )}
        {artifact.messages.map((m) => (
          <article className={`artifact-message ${m.role}`} key={m.id}>
            <strong>{m.role === "user" ? "You" : "Alice"}</strong>
            <p>{m.text}</p>
          </article>
        ))}
      </div>
      <form onSubmit={ask} className="artifact-chat-form">
        <textarea
          aria-label="Ask Alice about these results"
          value={text}
          maxLength={6000}
          onChange={(e) => setText(e.target.value)}
          placeholder="What drives the backlash? Add an impact chart by age…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!busy && ready) void ask();
            }
          }}
        />
        <button className="primary" disabled={busy || !ready || !text.trim()}>
          {busy ? "Thinking…" : "Send ↑"}
        </button>
      </form>
      {error && (
        <p className="bad" role="alert">
          ! {error}
        </p>
      )}
      <div className="artifact-charts">
        {artifact.charts.map((chart) => {
          const pv = run.result.per_variant.find(
            (v) => v.variant_id === chart.variant_id,
          );
          if (!pv) return null;
          const rows = pv.by_dimension[chart.dimension];
          return (
            <section className="added-chart" key={chart.id}>
              <h3>
                {chart.title} · Variant {chart.variant_id}
              </h3>
              {chart.kind === "line" ? (
                <p>
                  Use the Timeline tab to calculate a calendar scenario with
                  explicit assumptions.
                </p>
              ) : (
                rows.map((row) => {
                  const v = row[chart.metric];
                  return (
                    <div className="artifact-bar" key={row.group}>
                      <span>{pretty(row.group)}</span>
                      <i>
                        <b
                          style={{
                            width: `${chart.metric === "score" ? v : chart.metric === "sentiment" ? (v + 1) * 50 : v * 100}%`,
                          }}
                        />
                      </i>
                      <strong>
                        {chart.metric === "score"
                          ? v.toFixed(1)
                          : chart.metric === "sentiment"
                            ? v.toFixed(2)
                            : `${(v * 100).toFixed(1)}%`}
                      </strong>
                    </div>
                  );
                })
              )}
              <small>
                Computed from this run’s {pretty(chart.dimension)} metrics. No
                new reactions were generated.
              </small>
            </section>
          );
        })}
      </div>
    </section>
  );
}
function TimelinePlot({ points, metric }: { points: any[]; metric: string }) {
  const ids = [...new Set(points.map((p) => p.variant_id))];
  const dates = [...new Set(points.map((p) => p.date))];
  const min = metric === "sentiment" ? -1 : 0,
    max = metric === "score" ? 100 : 1;
  return (
    <div className="timeline-chart">
      <svg
        viewBox="0 0 760 260"
        role="img"
        aria-label={`Hypothetical ${pretty(metric)} by calendar date`}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const val = min + t * (max - min);
          return (
            <g key={t}>
              <line
                x1={62}
                x2={735}
                y1={220 - t * 185}
                y2={220 - t * 185}
                stroke="var(--line)"
              />
              <text x={8} y={225 - t * 185} fill="var(--muted)" fontSize={14}>
                {metric === "score"
                  ? val.toFixed(0)
                  : metric === "sentiment"
                    ? val.toFixed(1)
                    : `${(val * 100).toFixed(0)}%`}
              </text>
            </g>
          );
        })}
        {ids.map((id) => (
          <polyline
            key={id}
            fill="none"
            stroke={`var(--variant-${id.toLowerCase()})`}
            strokeWidth={3}
            points={points
              .filter((p) => p.variant_id === id)
              .map(
                (p) =>
                  `${62 + (dates.indexOf(p.date) / Math.max(1, dates.length - 1)) * 673},${220 - ((p[metric] - min) / (max - min)) * 185}`,
              )
              .join(" ")}
          />
        ))}
        <text x={62} y={250} fontSize={13} fill="var(--muted)">
          {dates[0]}
        </text>
        <text
          x={735}
          y={250}
          textAnchor="end"
          fontSize={13}
          fill="var(--muted)"
        >
          {dates.at(-1)}
        </text>
      </svg>
      <div className="legend">
        {ids.map((id) => (
          <span
            key={id}
            style={{ color: `var(--variant-${id.toLowerCase()})` }}
          >
            ━ Variant {id}
          </span>
        ))}
      </div>
    </div>
  );
}
