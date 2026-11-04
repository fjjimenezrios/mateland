import { z } from "zod";
import type { AdminField } from "../types";
import { gcd } from "./engine";

const int = (min: number, max: number) => z.number().int().min(min).max(max);

export type Pair = { width: number; height: number };

export function sidePairs(min: number, max: number) {
  const coprime: Pair[] = [];
  const shared: Pair[] = [];
  for (let width = min; width <= max; width++) {
    for (let height = min; height <= max; height++) {
      if (width === height) continue;
      (gcd(width, height) === 1 ? coprime : shared).push({ width, height });
    }
  }
  return { coprime, shared };
}

export const mcdSchema = z
  .object({
    minSide: int(4, 40),
    maxSide: int(4, 40),
    coprimePct: int(0, 100),
    hintSeconds: int(5, 300),
    hintAttempts: int(1, 10),
  })
  .superRefine((config, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (config.minSide > config.maxSide) return fail("minSide", "El lado mínimo no puede superar al máximo");
    const { coprime, shared } = sidePairs(config.minSide, config.maxSide);
    if (coprime.length + shared.length === 0) return fail("maxSide", "Hace falta un rango con al menos dos medidas distintas");
    if (config.coprimePct > 0 && coprime.length === 0) fail("coprimePct", "En ese rango no hay suelos cuyo mcd sea 1");
    if (config.coprimePct < 100 && shared.length === 0) fail("coprimePct", "En ese rango todos los suelos tienen mcd 1: sube la frecuencia a 100 %");
  });

export type McdConfig = z.infer<typeof mcdSchema>;

export const mcdDefaults: McdConfig = { minSide: 6, maxSide: 24, coprimePct: 15, hintSeconds: 40, hintAttempts: 3 };

export const mcdAdminFields: AdminField[] = [
  { key: "minSide", label: "Lado mínimo del suelo", type: "number", min: 4, max: 40, unit: "m" },
  { key: "maxSide", label: "Lado máximo del suelo", type: "number", min: 4, max: 40, unit: "m" },
  { key: "coprimePct", label: "Frecuencia de suelos con mcd = 1", type: "number", min: 0, max: 100, step: 5, unit: "%", help: "Solo caben baldosas de 1 × 1" },
  { key: "hintSeconds", label: "Segundos sin mover antes de ofrecer una pista", type: "number", min: 5, max: 300, step: 5, unit: "s" },
  { key: "hintAttempts", label: "Fallos antes de ofrecer ayuda", type: "number", min: 1, max: 10 },
];
