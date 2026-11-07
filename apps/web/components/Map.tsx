"use client";
import { useEffect, useRef } from "react";
import landData from "../public/land.json";
import {
  pretty,
  regions,
  type PersonaTable,
  type Result,
} from "@alice/contracts";
const centers = [
  [106.8, -6.2],
  [111, -7.1],
  [101, -0.8],
  [114, -0.3],
  [121.5, -2],
  [119, -8.6],
  [135, -3.5],
];
const colors = ["#fdf5e9", "#f2b84b", "#f48fb1"];
export default function Map({
  personas,
  result,
  variant = "A",
  metric = "score",
  selected,
  onSelect,
  stage = "",
  exposed = [],
  edges = [],
  sentiments = [],
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
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const land = landData;
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d")!;
    let raf = 0;
    let width = 0,
      height = 0;
    const reached = new Set(exposed);
    const observer = new ResizeObserver(() => {
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = width * devicePixelRatio;
      el.height = height * devicePixelRatio;
    });
    observer.observe(el);
    const draw = (time: number) => {
      if (!width) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
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
        for (let i = 0; i < n; i++) {
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
        for (const edge of edges.slice(-100)) {
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
      if (result) {
        ctx.textAlign = "center";
        centers.forEach(([lon, lat], i) => {
          const [x, y] = project(lon, lat);
          const m = pv?.by_dimension.region.find((g) => g.group === regions[i]);
          const value = m
            ? metric === "score"
              ? m.score.toFixed(0)
              : metric === "sentiment"
                ? m.sentiment.toFixed(2)
                : `${Math.round((m[metric as "reach"] ?? 0) * 100)}%`
            : "—";
          ctx.fillStyle = "#2e000b";
          ctx.beginPath();
          ctx.arc(x, y - 14, 19, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = selected === regions[i] ? "#ff7f76" : "#d9bdb6";
          ctx.stroke();
          ctx.font = "15px system-ui";
          ctx.fillStyle = "#fdf5e9";
          ctx.fillText(value, x, y - 9);
          ctx.font = "11px system-ui";
          ctx.fillText(pretty(regions[i]), x, y + 18);
        });
      }
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
      />
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
