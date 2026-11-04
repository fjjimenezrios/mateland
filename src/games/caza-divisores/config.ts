import { z } from "zod";
import { divisors, isPrime } from "@/lib/math";
import type { AdminField } from "../types";

const int = (min: number, max: number) => z.number().int().min(min).max(max);

export const MIN_DISTRACTORS = 3;

export function numberPools(minNumber: number, maxNumber: number, bubbles: number) {
  const primes: number[] = [];
  const composites: number[] = [];
  for (let n = minNumber; n <= maxNumber; n++) {
    if (isPrime(n)) primes.push(n);
    else if (divisors(n).length <= bubbles - MIN_DISTRACTORS) composites.push(n);
  }
  return { primes, composites };
}

export const cazaSchema = z
  .object({
    minNumber: int(2, 100),
    maxNumber: int(2, 100),
    bubbles: int(8, 16),
    primePct: int(0, 100),
    hintSeconds: int(5, 300),
    hintAttempts: int(1, 10),
  })
  .superRefine((config, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (config.minNumber > config.maxNumber) {
      fail("minNumber", "El número mínimo no puede superar al máximo");
      return;
    }
    const { primes, composites } = numberPools(config.minNumber, config.maxNumber, config.bubbles);
    if (config.primePct > 0 && primes.length === 0) fail("primePct", "No hay ningún número primo en ese rango");
    if (config.primePct < 100 && composites.length === 0) {
      fail("bubbles", "Ningún número del rango cabe con esa cantidad de burbujas: sube las burbujas o baja el máximo");
    }
  });

export type CazaConfig = z.infer<typeof cazaSchema>;

export const cazaDefaults: CazaConfig = {
  minNumber: 6,
  maxNumber: 48,
  bubbles: 12,
  primePct: 20,
  hintSeconds: 30,
  hintAttempts: 2,
};

export const cazaAdminFields: AdminField[] = [
  { key: "minNumber", label: "Número mínimo", type: "number", min: 2, max: 100 },
  { key: "maxNumber", label: "Número máximo", type: "number", min: 2, max: 100 },
  { key: "bubbles", label: "Burbujas en pantalla", type: "number", min: 8, max: 16, help: "Siempre habrá al menos 3 burbujas que no son divisores" },
  { key: "primePct", label: "Frecuencia de números primos", type: "number", min: 0, max: 100, step: 5, unit: "%" },
  { key: "hintSeconds", label: "Segundos sin tocar antes de ofrecer una pista", type: "number", min: 5, max: 300, step: 5, unit: "s" },
  { key: "hintAttempts", label: "Fallos antes de ofrecer ayuda", type: "number", min: 1, max: 10 },
];
