"use client";
import { readJson, requestTask } from "../lib/http";
import { useEffect, useRef, useState } from "react";
import type { Audience, Campaign, Result, Reaction } from "@alice/contracts";
import land from "../public/land.json";
import { pretty } from "../lib/display";
export default function AgentNetwork({
  run,
}: {
  run: {
    audience?: Audience;
    reactions: Reaction[];
    outcomes: any[];
    campaign: Campaign;
    result: Result;
  };
}) {
  const [variant, setVariant] = useState(run.campaign.variants[0].id);
  const [selected, setSelected] = useState<number | null>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);
  const rect = useRef({ w: 0, h: 0 });
  const a = run.audience;
  const o = run.outcomes.find((o) => o.variant_id === variant);
  const allEdges = (o?.edges ?? []).flat() as {
    from: number;
    to: number;
    anger: boolean;
  }[];
  const edges =
    selected === null
      ? allEdges.slice(0, 200)
      : allEdges.filter((e) => e.from === selected || e.to === selected);
  const index =
    selected === null ? null : a?.personas.archetype_index[selected];
  const person =
    index === null || index === undefined ? null : a?.archetypes[index];
  const reaction = person
    ? run.reactions.find(
        (r) => r.archetype_id === person.id && r.variant_id === variant,
      )
    : null;
  const [extraEnglish, setExtraEnglish] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!reaction) return;
    const texts = [reaction.sample_comment, reaction.reason].filter(
      (source) =>
        !run.result.translations.some((t) => t.source === source) &&
        !extraEnglish[source],
    );
    if (!texts.length) return;
    let active = true;
    fetch(`/api/runs/${(run as any).id ?? run.result.run_id}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ strings: texts }),
    })
      .then(readJson)
      .then((items) => {
        if (active && Array.isArray(items))
          setExtraEnglish((prev) => ({
            ...prev,
            ...Object.fromEntries(items.map((t) => [t.source, t.english])),
          }));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [reaction?.archetype_id, variant]);
  useEffect(() => {
    if (!a || !canvas.current) return;
    const el = canvas.current,
      ctx = el.getContext("2d")!;
    function paint() {
      const w = el.clientWidth,
        h = el.clientHeight;
      rect.current = { w, h };
      const ratio = Math.min(devicePixelRatio, 2);
      el.width = w * ratio;
      el.height = h * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const scale = Math.min((w - 40) / 47, (h - 40) / 17.8) * viewport.zoom;
      const point = (lon: number, lat: number) => [
        (lon - 118.1) * scale + w / 2 + viewport.x,
        (-2.3 - lat) * scale + h / 2 + viewport.y,
      ];
      for (const [lon, lat] of land) {
        const [x, y] = point(lon, lat);
        ctx.fillStyle = "rgba(198,54,60,.3)";
        ctx.fillRect(x, y, 2, 2);
      }
      const pos = (i: number) =>
        point(a!.personas.longitude[i], a!.personas.latitude[i]);
      for (const edge of edges) {
        const [x, y] = pos(edge.from),
          [tx, ty] = pos(edge.to);
        ctx.strokeStyle = edge.anger
          ? "rgba(255,107,97,.65)"
          : "rgba(253,245,233,.32)";
        ctx.lineWidth = selected === null ? 0.7 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      for (let i = 0; i < a!.personas.count; i++) {
        const [x, y] = pos(i);
        if (x < 0 || y < 0 || x > w || y > h) continue;
        const sentiment = o?.sentiment[i] ?? 0;
        ctx.fillStyle =
          o?.exposed[i] === 0
            ? "#a98388"
            : sentiment > 0.15
              ? "#7fd6a4"
              : sentiment < -0.15
                ? "#ff6b61"
                : "#f2b84b";
        ctx.beginPath();
        ctx.arc(
          x,
          y,
          selected === i ? 6 : Math.min(3.5, 1.8 * viewport.zoom),
          0,
          Math.PI * 2,
        );
        ctx.fill();
        if (selected === i) {
          ctx.strokeStyle = "#fdf5e9";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
    const obs = new ResizeObserver(paint);
    obs.observe(el);
    paint();
    return () => obs.disconnect();
  }, [a, o, selected, viewport]);
  function select(e: React.PointerEvent<HTMLCanvasElement>) {
    const d = drag.current;
    if (d?.moved) {
      drag.current = null;
      return;
    }
    if (!a) return;
    const box = e.currentTarget.getBoundingClientRect();
    const { x: ox, y: oy, zoom } = viewport;
    const { w, h } = rect.current;
    const scale = Math.min((w - 40) / 47, (h - 40) / 17.8) * zoom;
    const x = e.clientX - box.left,
      y = e.clientY - box.top;
    let closest = -1,
      best = 12;
    for (let i = 0; i < a.personas.count; i++) {
      const px = (a.personas.longitude[i] - 118.1) * scale + w / 2 + ox,
        py = (-2.3 - a.personas.latitude[i]) * scale + h / 2 + oy;
      const dist = Math.hypot(px - x, py - y);
      if (dist < best) {
        best = dist;
        closest = i;
      }
    }
    setSelected(closest < 0 ? null : closest);
    drag.current = null;
  }
  if (!a)
    return (
      <section className="panel">
        <p>
          No individual network was saved with this result. Run a new simulation
          to inspect the agents.
        </p>
      </section>
    );
  return (
    <div className="network-grid">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Inside the agent network</h2>
            <p className="muted">
              Drag to explore. Zoom in and select a person to inspect the actual
              model input and output.
            </p>
          </div>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as any)}
            aria-label="Network variant"
          >
            {run.campaign.variants.map((v) => (
              <option key={v.id} value={v.id}>
                Variant {v.id}
              </option>
            ))}
          </select>
        </div>
        <div className="network-toolbar">
          <button
            aria-label="Zoom in"
            onClick={() =>
              setViewport((v) => ({ ...v, zoom: Math.min(8, v.zoom * 1.5) }))
            }
          >
            ＋
          </button>
          <button
            aria-label="Zoom out"
            onClick={() =>
              setViewport((v) => ({ ...v, zoom: Math.max(0.7, v.zoom / 1.5) }))
            }
          >
            −
          </button>
          <button onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}>
            Reset view
          </button>
          <label>
            Inspect agent
            <select
              aria-label="Select individual agent"
              value={selected ?? ""}
              onChange={(e) =>
                setSelected(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            >
              <option value="">Choose a person</option>
              {Array.from({ length: a.personas.count }, (_, i) => (
                <option value={i} key={i}>
                  Agent {i + 1}
                </option>
              ))}
            </select>
          </label>
        </div>
        <canvas
          className="network-canvas"
          ref={canvas}
          aria-label="Interactive agent network on Indonesia map"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            drag.current = {
              x: e.clientX,
              y: e.clientY,
              ox: viewport.x,
              oy: viewport.y,
              moved: false,
            };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            const dx = e.clientX - d.x,
              dy = e.clientY - d.y;
            if (Math.hypot(dx, dy) > 4) d.moved = true;
            if (d.moved)
              setViewport((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
          }}
          onPointerUp={select}
          onPointerCancel={() => {
            drag.current = null;
          }}
        />
        <div className="legend">
          <span className="good">● Positive</span>
          <span className="warn">● Neutral</span>
          <span className="bad">
            ● Negative · coral links: anger-driven spread
          </span>
        </div>
        <p className="footnote">
          {edges.length} of {allEdges.length} saved transmission edges shown.
          The engine records a capped sample per tick; this is not the entire
          social graph.
        </p>
      </section>
      <section className="panel network-inspector">
        {person && reaction ? (
          <>
            <span className="eyebrow">
              Agent {selected! + 1} ·{" "}
              {person.persona_count === 1
                ? "One individual personality"
                : "Earlier grouped profile"}
            </span>
            <h2>{pretty(person.segment.region)}</h2>
            <div className="tags">
              <span>{person.segment.age_band}</span>
              <span>{person.segment.platform}</span>
              <span>{pretty(person.segment.city_tier)}</span>
            </div>
            <h3>Personality provided to the model</h3>
            <p>
              {person.blurb ||
                "This earlier recording did not save individual personality detail."}
            </p>
            <h3>Campaign input</h3>
            <p>
              {run.campaign.variants.find((v) => v.id === variant)?.headline}
            </p>
            <small>
              {
                run.result.translations.find(
                  (t) =>
                    t.source ===
                    run.campaign.variants.find((v) => v.id === variant)
                      ?.headline,
                )?.english
              }
            </small>
            <h3>Returned model reaction</h3>
            <blockquote>
              {reaction.sample_comment}
              <small className="translation">
                {run.result.translations.find(
                  (t) => t.source === reaction.sample_comment,
                )?.english ??
                  extraEnglish[reaction.sample_comment] ??
                  "English translation loading…"}
              </small>
            </blockquote>
            <p>
              {reaction.reason}
              <small className="translation">
                {extraEnglish[reaction.reason] ??
                  run.result.translations.find(
                    (t) => t.source === reaction.reason,
                  )?.english ??
                  "English translation loading…"}
              </small>
            </p>
            <table>
              <tbody>
                {(
                  [
                    "attention",
                    "sentiment",
                    "share_likelihood",
                    "click_likelihood",
                    "backlash_risk",
                  ] as const
                ).map((key) => (
                  <tr key={key}>
                    <td>{pretty(key)}</td>
                    <td>{reaction[key].toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Engine outcome for this person</h3>
            <p>
              {o?.exposed[selected!] ? "Reached" : "Not reached"} ·{" "}
              {o?.shared[selected!] ? "Shared" : "Did not share"} ·{" "}
              {o?.objected[selected!] ? "Objected" : "Did not object"}
            </p>
            <small>
              The model supplies judgments; Rust decides exposure and diffusion
              with the shared seed.
            </small>
          </>
        ) : (
          <>
            <h2>Select a person.</h2>
            <p className="muted">
              The inspector shows their supplied personality, returned metrics
              and synthetic comment, plus the engine’s recorded outcome.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
