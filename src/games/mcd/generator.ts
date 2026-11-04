import { type Rng, pick } from "@/lib/rng";
import { type McdConfig, type Pair, sidePairs } from "./config";

export type McdChallenge = Pair & { key: string };

export function generateMcd(config: McdConfig, rng: Rng, avoidKey?: string): McdChallenge {
  const pools = sidePairs(config.minSide, config.maxSide);
  const key = (pair: Pair) => `${pair.width}x${pair.height}`;
  const usable = (pool: Pair[], pct: number) => (pct > 0 ? pool.filter((pair) => key(pair) !== avoidKey) : []);

  let coprime = usable(pools.coprime, config.coprimePct);
  let shared = usable(pools.shared, 100 - config.coprimePct);
  if (coprime.length + shared.length === 0) {
    coprime = config.coprimePct > 0 ? pools.coprime : [];
    shared = config.coprimePct < 100 ? pools.shared : [];
  }
  if (coprime.length + shared.length === 0) throw new Error("La configuración no permite generar ejercicios");

  const useCoprime = coprime.length > 0 && (shared.length === 0 || rng() * 100 < config.coprimePct);
  const pair = pick(useCoprime ? coprime : shared, rng);
  return { ...pair, key: key(pair) };
}
