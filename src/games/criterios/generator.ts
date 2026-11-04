import { type Rng, pick, shuffle } from "@/lib/rng";
import { type CriteriosConfig, numberPools, toCriteria } from "./config";

export type CriteriosChallenge = { numbers: number[]; criteria: number[]; key: string };

function takeDistinct(pool: readonly number[], used: Set<number>, rng: Rng): number | null {
  const free = pool.filter((n) => !used.has(n));
  return free.length > 0 ? pick(free, rng) : null;
}

export function generateCriterios(config: CriteriosConfig, rng: Rng, avoidKey?: string): CriteriosChallenge {
  const criteria = toCriteria(config.criteria);
  const { none, some } = numberPools(config.minNumber, config.maxNumber, criteria);
  if (none.length + some.length === 0) throw new Error("La configuración no permite generar ejercicios");

  let numbers: number[] = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const used = new Set<number>();
    numbers = [];
    for (let i = 0; i < config.numbersPerRound; i++) {
      const wantNone = none.length > 0 && (some.length === 0 || rng() * 100 < config.nonePct);
      const value = takeDistinct(wantNone ? none : some, used, rng) ?? takeDistinct(wantNone ? some : none, used, rng);
      if (value !== null) {
        used.add(value);
        numbers.push(value);
      }
    }
    numbers = shuffle(numbers, rng);
    if (numbers.join("-") !== avoidKey) break;
  }
  return { numbers, criteria, key: numbers.join("-") };
}
