import { type Rng, pick, weightedIndex } from "@/lib/rng";
import type { NaranjasConfig } from "./config";
import { type Category, type Pair, candidatePairs } from "./pairs";

export type Challenge = Pair & { category: Category; key: string };

const CATEGORIES: Category[] = ["prime", "exact", "inexact"];
export const challengeKey = (pair: Pair) => `${pair.oranges}x${pair.baskets}`;

export function generateChallenge(config: NaranjasConfig, rng: Rng, avoidKey?: string): Challenge {
  const pools = candidatePairs(config);
  const weights: Record<Category, number> = {
    prime: config.primePct,
    exact: config.exactPct,
    inexact: 100 - config.primePct - config.exactPct,
  };
  const usable = (category: Category, avoid: boolean) =>
    weights[category] > 0 ? pools[category].filter((pair) => !avoid || challengeKey(pair) !== avoidKey) : [];

  const avoid = CATEGORIES.some((category) => usable(category, true).length > 0);
  const available = CATEGORIES.filter((category) => usable(category, avoid).length > 0);
  if (available.length === 0) throw new Error("La configuración no permite generar ejercicios");

  const category = available[weightedIndex(available.map((c) => weights[c]), rng)];
  const pair = pick(usable(category, avoid), rng);
  return { ...pair, category, key: challengeKey(pair) };
}
