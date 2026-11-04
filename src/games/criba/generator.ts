import { type Rng, pick } from "@/lib/rng";
import type { CribaConfig } from "./config";

export type CribaChallenge = { limit: number; key: string };

export function generateCriba(config: CribaConfig, rng: Rng, avoidKey?: string): CribaChallenge {
  const tens = Array.from({ length: 11 }, (_, i) => i * 10).filter((n) => n >= config.minNumber && n <= config.maxNumber);
  const pool = tens.length > 0 ? tens : Array.from({ length: config.maxNumber - config.minNumber + 1 }, (_, i) => config.minNumber + i);
  const fresh = pool.filter((n) => String(n) !== avoidKey);
  const limit = pick(fresh.length > 0 ? fresh : pool, rng);
  return { limit, key: String(limit) };
}
