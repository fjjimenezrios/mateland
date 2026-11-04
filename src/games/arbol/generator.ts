import { type Rng, pick } from "@/lib/rng";
import { type ArbolConfig, numberPool } from "./config";

export type ArbolChallenge = { n: number; key: string };

export function generateArbol(config: ArbolConfig, rng: Rng, avoidKey?: string): ArbolChallenge {
  const pool = numberPool(config.minNumber, config.maxNumber, config.minFactors);
  if (pool.length === 0) throw new Error("La configuración no permite generar ejercicios");
  const fresh = pool.filter((n) => String(n) !== avoidKey);
  const n = pick(fresh.length > 0 ? fresh : pool, rng);
  return { n, key: String(n) };
}
