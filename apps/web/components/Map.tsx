"use client";
import { useEffect, useRef, useState } from "react";
import landData from "../public/land.json";
import { type PersonaTable, type Result } from "@alice/contracts";
import { dimensions, regions, pretty } from "../lib/display";
const centers = [
  [106.8, -6.2],
  [111, -7.1],
  [101, -0.8],
  [114, -0.3],
  [121.5, -2],
  [119, -8.6],
  [135, -3.5],
];
const EMPTY_NUMBERS: number[] = [];
const EMPTY_EDGES: { from: number; to: number; anger: boolean }[] = [];
const EMPTY_SENTIMENTS: (number | undefined)[] = [];
export default function Map({
  personas,
  result,
  variant = "A",
  metric = "score",
  selected,
  onSelect,
  stage = "",
  exposed = EMPTY_NUMBERS,
  edges = EMPTY_EDGES,
  sentiments = EMPTY_SENTIMENTS,
  onAgentClick,
}: {
  personas?: PersonaTable;
  result?: Result;
  variant?: string;
  metric?: string;
  selected?: string;
  onSelect?: (s: string) => void;
  stage?: string;
  exposed?: number[];
  edges?: { from: number; to: number; anger: boolean }[];
  sentiments?: (number | undefined)[];
  onAgentClick?: (index: number) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);
  const land = landData;
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d")!;
    let raf = 0;
    let width = 0,
      height = 0;
    const reached = new Set(exposed);
    const started = performance.now();
    const observer = new ResizeObserver(() => {
      width = el.clientWidth;
      height = el.clientHeight;
      const ratio = Math.min(devicePixelRatio, 2);
      el.width = width * ratio;
      el.height = height * ratio;
      setSize((old) =>
        old[0] === width && old[1] === height ? old : [width, height],
      );
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    });
    observer.observe(el);
    const draw = (time: number) => {
      if (!width) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.setTransform(
        Math.min(devicePixelRatio, 2),
        0,
        0,
        Math.min(devicePixelRatio, 2),
        0,
        0,
      );
      ctx.clearRect(0, 0, width, height);
      const scale = Math.min((width - 36) / 47, (height - 48) / 17.8);
      const project = (lon: number, lat: number) => [
        (lon - 94.6) * scale + (width - 47 * scale) / 2,
        (6.6 - lat) * scale + (height - 17.8 * scale) / 2,
      ];
      const pv = result?.per_variant.find((v) => v.variant_id === variant);
      for (const [lon, lat, r] of land) {
        const [x, y] = project(lon, lat);
        let fill = "rgba(198,54,60,.47)";
        if (pv) {
          const m = pv.by_dimension.region.find((g) => g.group === regions[r]);
          if (m) {
            const val = m[metric as keyof typeof m] as number;
            const t =
              metric === "score"
                ? val / 100
                : metric === "sentiment"
                  ? (val + 1) / 2
                  : metric === "backlash"
                    ? 1 - val
                    : val;
            fill = t < 0.35 ? "#ff6b61" : t < 0.62 ? "#f2b84b" : "#7fd6a4";
            if (selected && selected !== regions[r])
              fill = "rgba(198,54,60,.22)";
          }
        }
        ctx.fillStyle = fill;
        ctx.fillRect(
          x,
          y,
          Math.max(1.6, scale * 0.13),
          Math.max(1.6, scale * 0.13),
        );
      }
      if (personas && !result) {
        const n = personas.count;
        const reveal = stage.includes("Building")
          ? Math.min(n, Math.floor(((time - started) / 1600) * n))
          : n;
        for (let i = 0; i < reveal; i++) {
          const [x, y] = project(personas.longitude[i], personas.latitude[i]);
          const active = reached.size === 0 || reached.has(i);
          ctx.fillStyle = stage.includes("react")
            ? sentiments[personas.archetype_index[i]] === undefined
              ? "rgba(217,189,182,.22)"
              : sentiments[personas.archetype_index[i]]! > 0.15
                ? "#7fd6a4"
                : sentiments[personas.archetype_index[i]]! < -0.15
                  ? "#ff6b61"
                  : "#f2b84b"
            : stage.includes("spread")
              ? active
                ? "#fdf5e9"
                : "rgba(217,189,182,.16)"
              : [
                  "#fdf5e9",
                  "#f48fb1",
                  "#ff6b61",
                  "#f2b84b",
                  "#b9a398",
                  "#7fd6a4",
                ][personas.platform[i]];
          ctx.globalAlpha = stage.includes("Building")
            ? 0.5 + 0.5 * Math.sin(time / 1100 + i * 0.01) ** 2
            : 0.85;
          ctx.fillRect(x, y, 2.2, 2.2);
        }
        ctx.globalAlpha = 1;
        for (const edge of edges.slice(-180)) {
          if (
            stage.includes("react") &&
            (sentiments[personas.archetype_index[edge.from]] === undefined ||
              sentiments[personas.archetype_index[edge.to]] === undefined)
          )
            continue;
          const [x, y] = project(
            personas.longitude[edge.from],
            personas.latitude[edge.from],
          );
          const [tx, ty] = project(
            personas.longitude[edge.to],
            personas.latitude[edge.to],
          );
          ctx.strokeStyle = edge.anger
            ? "rgba(255,107,97,.5)"
            : "rgba(253,245,233,.35)";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo((x + tx) / 2, (y + ty) / 2 - 20, tx, ty);
          ctx.stroke();
        }
      }
      if (!personas && !result) {
        const sweep = (time / 80) % width;
        const glow = ctx.createRadialGradient(
          sweep,
          height * 0.5,
          0,
          sweep,
          height * 0.5,
          width * 0.23,
        );
        glow.addColorStop(0, "rgba(198,54,60,.14)");
        glow.addColorStop(1, "rgba(198,54,60,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }
      if (
        !result &&
        personas &&
        stage.includes("Building") &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      )
        raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [
    land,
    personas,
    result,
    variant,
    metric,
    selected,
    stage,
    exposed,
    edges,
    sentiments,
  ]);
  return (
    <div className="map-container">
      <canvas
        ref={canvas}
        role="img"
        aria-label="Dot matrix map of Indonesia, with synthetic audience positions"
        onClick={(e) => {
          if (!personas || !onAgentClick) return;
          const box = e.currentTarget.getBoundingClientRect();
          const scale = Math.min((size[0] - 36) / 47, (size[1] - 48) / 17.8);
          let closest = -1,
            dist = 12;
          for (let i = 0; i < personas.count; i++) {
            const x =
              (personas.longitude[i] - 94.6) * scale +
              (size[0] - 47 * scale) / 2;
            const y =
              (6.6 - personas.latitude[i]) * scale +
              (size[1] - 17.8 * scale) / 2;
            const d = Math.hypot(
              e.clientX - box.left - x,
              e.clientY - box.top - y,
            );
            if (d < dist) {
              dist = d;
              closest = i;
            }
          }
          if (closest >= 0) onAgentClick(closest);
        }}
      />
      {result && size[0] > 0 && (
        <div className="map-labels">
          {centers.map(([lon, lat], i) => {
            const m = result.per_variant
              .find((v) => v.variant_id === variant)
              ?.by_dimension.region.find((g) => g.group === regions[i]);
            const scale = Math.min((size[0] - 36) / 47, (size[1] - 48) / 17.8);
            const x = (lon - 94.6) * scale + (size[0] - 47 * scale) / 2;
            const y =
              (6.6 - lat) * scale +
              (size[1] - 17.8 * scale) / 2 +
              (i === 0 ? -30 : i === 1 ? 16 : 0);
            const value = !m
              ? "—"
              : metric === "score"
                ? m.score.toFixed(1)
                : metric === "sentiment"
                  ? m.sentiment.toFixed(2)
                  : `${((m[metric as "reach"] ?? 0) * 100).toFixed(1)}%`;
            return (
              <button
                key={regions[i]}
                className="map-value"
                style={{ left: x, top: y }}
                onClick={() => onSelect?.(regions[i])}
                aria-label={`${pretty(regions[i])}: ${value} ${metric === "score" ? "impact out of 100" : metric}`}
              >
                <strong>{value}</strong>
                <span>{pretty(regions[i])}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="map-coordinate">
        6° N <span>Indonesia · 7 audience regions</span>11° S
      </div>
      {onSelect && (
        <div className="map-region-buttons">
          {regions.map((r) => (
            <button
              className={selected === r ? "active" : ""}
              onClick={() => onSelect(selected === r ? "" : r)}
              key={r}
            >
              {pretty(r)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
