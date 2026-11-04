import { divisors, isPrime } from "@/lib/math";
import { type Rng, pick, shuffle } from "@/lib/rng";
import { type CazaConfig, MIN_DISTRACTORS, numberPools } from "./config";

export type CazaChallenge = { n: number; bubbles: number[]; targets: number[]; key: string };

export function generateCaza(config: CazaConfig, rng: Rng, avoidKey?: string): CazaChallenge {
  const { primes, composites } = numberPools(config.minNumber, config.maxNumber, config.bubbles);
  const wantPrime = primes.length > 0 && (composites.length === 0 || rng() * 100 < config.primePct);
  const pool = wantPrime ? primes : composites;
  if (pool.length === 0) throw new Error("La configuración no permite generar ejercicios");

  const fresh = pool.filter((n) => String(n) !== avoidKey);
  const n = pick(fresh.length > 0 ? fresh : pool, rng);
  const targets = divisors(n);
  const distractorCount = config.bubbles - targets.length;
  const nonDivisors = Array.from({ length: Math.max(n + 12, config.bubbles * 2) - 1 }, (_, i) => i + 2).filter(
    (candidate) => n % candidate !== 0,
  );
  const distractors = shuffle(nonDivisors, rng).slice(0, Math.max(distractorCount, MIN_DISTRACTORS));
  return { n, targets, bubbles: shuffle([...targets, ...distractors], rng), key: String(n) };
}

export const describeNumber = (n: number) => (isPrime(n) ? `${n} (primo)` : String(n));
