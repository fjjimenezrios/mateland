import { z } from "zod";
import type { AdminField } from "../types";

const int = (min: number, max: number) => z.number().int().min(min).max(max);

export const CRITERIA_VALUES = ["2", "3", "4", "5", "6", "9", "10", "11"] as const;
export type Criterion = 2 | 3 | 4 | 5 | 6 | 9 | 10 | 11;

export const toCriteria = (values: readonly string[]): Criterion[] =>
  [...new Set(values.map(Number))].sort((a, b) => a - b) as Criterion[];

export const matchingCriteria = (n: number, criteria: readonly number[]) => criteria.filter((d) => n % d === 0);

export function numberPools(min: number, max: number, criteria: readonly number[]) {
  const none: number[] = [];
  const some: number[] = [];
  for (let n = min; n <= max; n++) (matchingCriteria(n, criteria).length === 0 ? none : some).push(n);
  return { none, some };
}

export const criteriosSchema = z
  .object({
    numbersPerRound: int(3, 8),
    minNumber: int(10, 9999),
    maxNumber: int(10, 9999),
    nonePct: int(0, 100),
    criteria: z.array(z.enum(CRITERIA_VALUES)).min(1, "Elige al menos un criterio"),
    hintSeconds: int(5, 300),
    hintAttempts: int(1, 10),
  })
  .superRefine((config, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (config.minNumber > config.maxNumber) return fail("minNumber", "El mínimo no puede superar al máximo");
    if (config.maxNumber - config.minNumber + 1 < config.numbersPerRound) {
      return fail("maxNumber", "El rango es demasiado pequeño para tantos números distintos");
    }
    const { none, some } = numberPools(config.minNumber, config.maxNumber, toCriteria(config.criteria));
    if (config.nonePct > 0 && none.length === 0) fail("nonePct", "En ese rango no hay números que no sean divisibles por ningún criterio elegido");
    if (config.nonePct < 100 && some.length === 0) fail("criteria", "En ese rango ningún número cumple los criterios elegidos");
  });

export type CriteriosConfig = z.infer<typeof criteriosSchema>;

export const criteriosDefaults: CriteriosConfig = {
  numbersPerRound: 5,
  minNumber: 20,
  maxNumber: 999,
  nonePct: 20,
  criteria: ["2", "3", "5", "9", "10"],
  hintSeconds: 40,
  hintAttempts: 3,
};

export const criteriosAdminFields: AdminField[] = [
  { key: "numbersPerRound", label: "Números por desafío", type: "number", min: 3, max: 8 },
  { key: "minNumber", label: "Número mínimo", type: "number", min: 10, max: 9999 },
  { key: "maxNumber", label: "Número máximo", type: "number", min: 10, max: 9999 },
  { key: "nonePct", label: "Frecuencia de números sin ningún criterio", type: "number", min: 0, max: 100, step: 5, unit: "%", help: "Van al tubo «Ninguno»" },
  {
    key: "criteria",
    label: "Criterios que aparecen (tubos)",
    type: "multi",
    options: CRITERIA_VALUES.map((value) => ({ value, label: `÷${value}` })),
  },
  { key: "hintSeconds", label: "Segundos sin mover antes de ofrecer una pista", type: "number", min: 5, max: 300, step: 5, unit: "s" },
  { key: "hintAttempts", label: "Fallos antes de ofrecer ayuda", type: "number", min: 1, max: 10 },
];
