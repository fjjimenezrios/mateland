import { z } from "zod";
import type { AdminField } from "../types";
import { primeFactors } from "./engine";

const int = (min: number, max: number) => z.number().int().min(min).max(max);

export function numberPool(min: number, max: number, minFactors: number): number[] {
  const pool: number[] = [];
  for (let n = Math.max(4, min); n <= max; n++) if (primeFactors(n).length >= minFactors) pool.push(n);
  return pool;
}

export const arbolSchema = z
  .object({
    minNumber: int(4, 500),
    maxNumber: int(4, 500),
    minFactors: int(2, 6),
    hintSeconds: int(5, 300),
    hintAttempts: int(1, 10),
  })
  .superRefine((config, ctx) => {
    if (config.minNumber > config.maxNumber) {
      return ctx.addIssue({ code: "custom", path: ["minNumber"], message: "El mínimo no puede superar al máximo" });
    }
    if (numberPool(config.minNumber, config.maxNumber, config.minFactors).length === 0) {
      ctx.addIssue({ code: "custom", path: ["minFactors"], message: "Ningún número del rango tiene tantos factores primos: baja los factores o sube el máximo" });
    }
  });

export type ArbolConfig = z.infer<typeof arbolSchema>;

export const arbolDefaults: ArbolConfig = { minNumber: 12, maxNumber: 120, minFactors: 3, hintSeconds: 40, hintAttempts: 3 };

export const arbolAdminFields: AdminField[] = [
  { key: "minNumber", label: "Número mínimo", type: "number", min: 4, max: 500 },
  { key: "maxNumber", label: "Número máximo", type: "number", min: 4, max: 500 },
  { key: "minFactors", label: "Factores primos mínimos", type: "number", min: 2, max: 6, help: "Cuenta las repeticiones: 12 = 2 × 2 × 3 tiene 3. Más factores, más difícil" },
  { key: "hintSeconds", label: "Segundos sin mover antes de ofrecer una pista", type: "number", min: 5, max: 300, step: 5, unit: "s" },
  { key: "hintAttempts", label: "Fallos antes de ofrecer ayuda", type: "number", min: 1, max: 10 },
];
