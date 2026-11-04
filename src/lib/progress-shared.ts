import { z } from "zod";
import { games } from "@/games/registry";

export type Totals = { completed: number; solved: number; hintsUsed: number; bestStreak: number };
export type ProgressMap = Record<string, Totals>;

export const emptyTotals = (): Totals => ({ completed: 0, solved: 0, hintsUsed: 0, bestStreak: 0 });

const counter = (max: number) => z.number().int().min(0).max(max);

export const progressDeltaSchema = z.record(
  z.string().refine((slug) => games.some((game) => game.slug === slug), "Juego desconocido"),
  z.object({
    completed: counter(500),
    solved: counter(500),
    hintsUsed: counter(5000),
    bestStreak: counter(500),
  }).refine((totals) => totals.solved <= totals.completed, "Datos incoherentes"),
);

export function mergeTotals(current: Totals, delta: Totals): Totals {
  return {
    completed: current.completed + delta.completed,
    solved: current.solved + delta.solved,
    hintsUsed: current.hintsUsed + delta.hintsUsed,
    bestStreak: Math.max(current.bestStreak, delta.bestStreak),
  };
}

export function mergeProgress(current: ProgressMap, delta: ProgressMap): ProgressMap {
  const result: ProgressMap = { ...current };
  for (const [slug, totals] of Object.entries(delta)) {
    result[slug] = mergeTotals(result[slug] ?? emptyTotals(), totals);
  }
  return result;
}

export const isEmptyProgress = (progress: ProgressMap) =>
  Object.values(progress).every((t) => t.completed === 0 && t.hintsUsed === 0);
