import { type Rng, pick } from "@/lib/rng";
import { type McmConfig, type Periods, periodPairs } from "./config";

export type McmChallenge = Periods & { key: string };

export function generateMcm(config: McmConfig, rng: Rng, avoidKey?: string): McmChallenge {
  const pairs = periodPairs(config.minPeriod, config.maxPeriod, config.maxLcm);
  if (pairs.length === 0) throw new Error("La configuración no permite generar ejercicios");
  const key = (pair: Periods) => `${pair.a}-${pair.b}`;
  const fresh = pairs.filter((pair) => key(pair) !== avoidKey && key({ a: pair.b, b: pair.a }) !== avoidKey);
  const pair = pick(fresh.length > 0 ? fresh : pairs, rng);
  const swap = rng() < 0.5;
  const chosen = swap ? { a: pair.b, b: pair.a } : pair;
  return { ...chosen, key: key(pair) };
}
