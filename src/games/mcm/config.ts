import { z } from "zod";
import type { AdminField } from "../types";
import { lcm } from "./engine";

const int = (min: number, max: number) => z.number().int().min(min).max(max);

export type Periods = { a: number; b: number };

export function periodPairs(min: number, max: number, maxLcm: number): Periods[] {
  const pairs: Periods[] = [];
  for (let a = min; a <= max; a++) for (let b = a + 1; b <= max; b++) if (lcm(a, b) <= maxLcm) pairs.push({ a, b });
  return pairs;
}

export const mcmSchema = z
  .object({
    minPeriod: int(2, 15),
    maxPeriod: int(3, 20),
    maxLcm: int(12, 120),
    hintSeconds: int(5, 300),
    hintAttempts: int(1, 10),
  })
  .superRefine((config, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (config.minPeriod >= config.maxPeriod) return fail("minPeriod", "El mínimo debe ser menor que el máximo");
    if (periodPairs(config.minPeriod, config.maxPeriod, config.maxLcm).length === 0) {
      fail("maxLcm", "Ninguna pareja del rango coincide antes de ese límite: sube el límite de coincidencia");
    }
  });

export type McmConfig = z.infer<typeof mcmSchema>;

export const mcmDefaults: McmConfig = { minPeriod: 2, maxPeriod: 10, maxLcm: 60, hintSeconds: 40, hintAttempts: 3 };

export const mcmAdminFields: AdminField[] = [
  { key: "minPeriod", label: "Parpadeo más rápido (cada… segundos)", type: "number", min: 2, max: 15, unit: "s" },
  { key: "maxPeriod", label: "Parpadeo más lento (cada… segundos)", type: "number", min: 3, max: 20, unit: "s" },
  { key: "maxLcm", label: "Límite de la línea de tiempo", type: "number", min: 12, max: 120, step: 6, unit: "s", help: "Las luces siempre coincidirán antes de este momento" },
  { key: "hintSeconds", label: "Segundos sin mover antes de ofrecer una pista", type: "number", min: 5, max: 300, step: 5, unit: "s" },
  { key: "hintAttempts", label: "Fallos antes de ofrecer ayuda", type: "number", min: 1, max: 10 },
];
