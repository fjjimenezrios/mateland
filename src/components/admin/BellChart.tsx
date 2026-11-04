"use client";

import { useState } from "react";
import { type Histogram, normalPdf, type Summary } from "@/lib/stats";

const W = 680;
const H = 320;
const M = { left: 46, right: 18, top: 34, bottom: 54 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });

type Marker = { name: string; value: number };
type Props = { histogram: Histogram; summary: Summary | null; xLabel: string; marker: Marker | null };

function niceTicks(max: number): number[] {
  const step = [1, 2, 5, 10, 20, 50, 100].find((candidate) => max / candidate <= 5) ?? 100;
  return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
}

function barPath(x: number, width: number, top: number, base: number): string {
  const radius = Math.min(4, width / 2, base - top);
  return `M${x},${base} V${top + radius} Q${x},${top} ${x + radius},${top} H${x + width - radius} Q${x + width},${top} ${x + width},${top + radius} V${base} Z`;
}

export function BellChart({ histogram, summary, xLabel, marker }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const { bins, step, origin } = histogram;
  const span = bins.length * step;
  const showCurve = summary !== null && summary.n >= 3 && summary.sd > 0;
  const px = (value: number) => M.left + ((value - origin) / span) * PLOT_W;

  const curve = showCurve
    ? Array.from({ length: 121 }, (_, i) => {
        const x = origin + (span * i) / 120;
        return { x, y: summary.n * step * normalPdf(x, summary.mean, summary.sd) };
      })
    : [];
  const peak = Math.max(1, ...bins.map((bin) => bin.count), ...curve.map((point) => point.y));
  const ticks = niceTicks(Math.ceil(peak));
  const yMax = Math.max(...ticks, Math.ceil(peak));
  const py = (count: number) => M.top + PLOT_H - (count / yMax) * PLOT_H;
  const base = M.top + PLOT_H;

  const hovered = hover === null ? null : bins[hover];
  const summaryText = summary
    ? `Histograma de ${summary.n} alumnos. Media ${number.format(summary.mean)}, desviación típica ${number.format(summary.sd)}.`
    : "Sin datos";

  return (
    <div className="viz-root rounded-2xl p-4" style={{ background: "var(--surface-1)", color: "var(--text-primary)" }}>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        <span className="flex items-center gap-2">
          <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ background: "var(--series-1)" }} />
          Alumnos en cada tramo
        </span>
        {showCurve ? (
          <span className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-0.5 w-5 rounded" style={{ background: "var(--series-2)" }} />
            Curva normal ajustada
          </span>
        ) : null}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={summaryText}>
          <title>{summaryText}</title>
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={M.left} x2={W - M.right} y1={py(tick)} y2={py(tick)} stroke="var(--grid)" strokeWidth="1" />
              <text x={M.left - 8} y={py(tick) + 4} textAnchor="end" fontSize="11" fill="var(--text-secondary)">
                {tick}
              </text>
            </g>
          ))}
          <text x={M.left - 40} y={M.top - 16} textAnchor="start" fontSize="11" fontWeight="700" fill="var(--text-secondary)">
            Alumnos
          </text>

          {showCurve ? (
            <rect
              x={px(Math.max(origin, summary.mean - summary.sd))}
              width={px(Math.min(origin + span, summary.mean + summary.sd)) - px(Math.max(origin, summary.mean - summary.sd))}
              y={M.top}
              height={PLOT_H}
              fill="var(--series-1)"
              opacity="0.07"
            />
          ) : null}

          {bins.map((bin, index) => {
            const x = px(bin.from) + 1;
            const width = px(bin.to) - px(bin.from) - 2;
            return (
              <g key={bin.label}>
                {bin.count > 0 ? <path d={barPath(x, width, py(bin.count), base)} fill="var(--series-1)" opacity={hover === index ? 1 : 0.88} /> : null}
                <text x={x + width / 2} y={base + 18} textAnchor="middle" fontSize="11" fill="var(--text-secondary)">
                  {bin.label}
                </text>
                <rect
                  x={px(bin.from)}
                  y={M.top}
                  width={px(bin.to) - px(bin.from)}
                  height={PLOT_H}
                  fill="transparent"
                  tabIndex={0}
                  role="img"
                  aria-label={`${bin.label}: ${bin.count} ${bin.count === 1 ? "alumno" : "alumnos"}${bin.names.length ? ` (${bin.names.join(", ")})` : ""}`}
                  onPointerEnter={() => setHover(index)}
                  onPointerLeave={() => setHover(null)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                  style={{ outline: "none" }}
                />
              </g>
            );
          })}

          <line x1={M.left} x2={W - M.right} y1={base} y2={base} stroke="var(--text-muted)" strokeWidth="1" />

          {showCurve ? (
            <polyline
              points={curve.map((point) => `${px(point.x).toFixed(1)},${py(point.y).toFixed(1)}`).join(" ")}
              fill="none"
              stroke="var(--series-2)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pointerEvents="none"
            />
          ) : null}

          {summary ? (
            <g pointerEvents="none">
              <line x1={px(summary.mean)} x2={px(summary.mean)} y1={M.top - 4} y2={base} stroke="var(--text-secondary)" strokeWidth="1" />
              <text x={Math.min(Math.max(px(summary.mean), M.left + 30), W - M.right - 30)} y={M.top - 10} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text-primary)" stroke="var(--surface-1)" strokeWidth="4" paintOrder="stroke">
                media {number.format(summary.mean)}
              </text>
            </g>
          ) : null}

          {marker ? (
            <g pointerEvents="none">
              <line x1={px(marker.value)} x2={px(marker.value)} y1={M.top + 6} y2={base} stroke="var(--text-primary)" strokeWidth="1.5" />
              <circle cx={px(marker.value)} cy={M.top + 6} r="6" fill="var(--text-primary)" stroke="var(--surface-1)" strokeWidth="2" />
              <text x={Math.min(px(marker.value) + 10, W - M.right - 4)} y={M.top + 10} textAnchor={px(marker.value) > W - 150 ? "end" : "start"} dx={px(marker.value) > W - 150 ? -18 : 0} fontSize="12" fontWeight="700" fill="var(--text-primary)" stroke="var(--surface-1)" strokeWidth="4" paintOrder="stroke">
                {marker.name} · {number.format(marker.value)}
              </text>
            </g>
          ) : null}

          <text x={M.left + PLOT_W / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--text-secondary)">
            {xLabel}
          </text>
        </svg>

        {hovered ? (
          <div
            role="status"
            className="pointer-events-none absolute z-10 max-w-56 rounded-xl border px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(((px(hovered.from) + px(hovered.to)) / 2) / W) * 100}%`,
              top: 8,
              transform: "translateX(-50%)",
              background: "var(--surface-1)",
              borderColor: "var(--grid)",
            }}
          >
            <p className="text-base font-extrabold">
              {hovered.count} {hovered.count === 1 ? "alumno" : "alumnos"}
            </p>
            <p style={{ color: "var(--text-secondary)" }}>{hovered.label}</p>
            {hovered.names.length > 0 ? (
              <p className="mt-1" style={{ color: "var(--text-secondary)" }}>
                {hovered.names.slice(0, 8).join(", ")}
                {hovered.names.length > 8 ? ` y ${hovered.names.length - 8} más` : ""}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
