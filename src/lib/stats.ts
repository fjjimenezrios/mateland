import type { ProgressMap } from "./progress-shared";

export type Metric = "completed" | "autonomy" | "streak";

export const METRICS: { id: Metric; label: string; short: string; help: string }[] = [
  { id: "completed", label: "Retos completados", short: "Retos", help: "Cuántos desafíos ha terminado el alumno" },
  { id: "autonomy", label: "Autonomía (% sin pistas)", short: "Autonomía", help: "De los retos completados, qué porcentaje ha resuelto sin pedir ninguna pista" },
  { id: "streak", label: "Mejor racha sin pistas", short: "Racha", help: "Más retos seguidos resueltos sin pistas" },
];

export type StudentRecord = {
  id: string;
  classId: string;
  username: string;
  active: boolean;
  totals: ProgressMap;
  updatedAt: number;
};

export type StudentStats = { completed: number; solved: number; hints: number; streak: number };

export function totalsOf(totals: ProgressMap, slugs: readonly string[]): StudentStats {
  const stats: StudentStats = { completed: 0, solved: 0, hints: 0, streak: 0 };
  for (const slug of slugs) {
    const item = totals[slug];
    if (!item) continue;
    stats.completed += item.completed;
    stats.solved += item.solved;
    stats.hints += item.hintsUsed;
    stats.streak = Math.max(stats.streak, item.bestStreak);
  }
  return stats;
}

export function metricValue(stats: StudentStats, metric: Metric): number | null {
  if (stats.completed === 0) return null;
  if (metric === "completed") return stats.completed;
  if (metric === "streak") return stats.streak;
  return Math.round((stats.solved / stats.completed) * 100);
}

export type Summary = { n: number; mean: number; sd: number; median: number; min: number; max: number };

export function summarize(values: readonly number[]): Summary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((sum, value) => sum + value, 0) / n;
  const variance = n > 1 ? sorted.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1) : 0;
  const middle = Math.floor(n / 2);
  return {
    n,
    mean,
    sd: Math.sqrt(variance),
    median: n % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle],
    min: sorted[0],
    max: sorted[n - 1],
  };
}

export const zScore = (value: number, summary: Summary) => (summary.sd === 0 ? 0 : (value - summary.mean) / summary.sd);

export type Band = "support" | "typical" | "high" | "none";
export const bandOf = (z: number | null): Band => (z === null ? "none" : z <= -1 ? "support" : z >= 1 ? "high" : "typical");

export type Row = { student: StudentRecord; stats: StudentStats; value: number | null; z: number | null; band: Band };

export function buildRows(students: readonly StudentRecord[], slugs: readonly string[], metric: Metric) {
  const base = students.map((student) => {
    const stats = totalsOf(student.totals, slugs);
    return { student, stats, value: metricValue(stats, metric) };
  });
  const summary = summarize(base.flatMap((row) => (row.value === null ? [] : [row.value])));
  const rows: Row[] = base.map((row) => {
    const z = row.value !== null && summary ? zScore(row.value, summary) : null;
    return { ...row, z, band: bandOf(z) };
  });
  return { rows, summary };
}

export type Bin = { from: number; to: number; label: string; count: number; names: string[] };
export type Histogram = { bins: Bin[]; step: number; origin: number };

export function histogram(points: readonly { name: string; value: number }[], metric: Metric): Histogram {
  const isPercent = metric === "autonomy";
  const top = Math.max(0, ...points.map((point) => point.value));
  const step = isPercent ? 10 : Math.max(1, Math.ceil((top + 1) / 8));
  const count = isPercent ? 10 : Math.max(1, Math.ceil((top + 1) / step));
  const origin = isPercent ? 0 : -0.5;
  const bins: Bin[] = Array.from({ length: count }, (_, index) => {
    const low = index * step;
    const high = isPercent && index === count - 1 ? 100 : low + step - 1;
    return {
      from: origin + low,
      to: origin + low + step,
      label: low === high ? String(low) : `${low}–${high}${isPercent ? "%" : ""}`,
      count: 0,
      names: [],
    };
  });
  for (const point of points) {
    const bin = bins[Math.min(count - 1, Math.floor(point.value / step))];
    bin.count += 1;
    bin.names.push(point.name);
  }
  return { bins, step, origin };
}

export function normalPdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
}

export function lastSeenText(updatedAt: number, now: number): string {
  if (!updatedAt) return "Nunca";
  const minutes = Math.floor((now - updatedAt) / 60000);
  if (minutes < 60) return "Hace unos minutos";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Ayer" : `Hace ${days} días`;
}

const csvCell = (value: string | number) => {
  const text = String(value);
  return /[;"\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function toCsv(rows: readonly Row[], className: (id: string) => string, now: number): string {
  const header = ["Alumno", "Clase", "Retos completados", "Sin pistas", "Autonomía (%)", "Pistas usadas", "Mejor racha", "Última conexión"];
  const lines = rows.map((row) =>
    [
      row.student.username,
      className(row.student.classId),
      row.stats.completed,
      row.stats.solved,
      row.stats.completed ? Math.round((row.stats.solved / row.stats.completed) * 100) : "",
      row.stats.hints,
      row.stats.streak,
      lastSeenText(row.student.updatedAt, now),
    ]
      .map(csvCell)
      .join(";"),
  );
  return `﻿${[header.map(csvCell).join(";"), ...lines].join("\r\n")}`;
}
