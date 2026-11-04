import { z } from "zod";
import type { AdminField } from "../types";
import { candidatePairs } from "./pairs";

export const MODES = ["drag", "group"] as const;
export type Mode = (typeof MODES)[number];

const int = (min: number, max: number) => z.number().int().min(min).max(max);

export const naranjasSchema = z
  .object({
    minOranges: int(3, 40),
    maxOranges: int(3, 40),
    minBaskets: int(2, 10),
    maxBaskets: int(2, 10),
    primePct: int(0, 100),
    exactPct: int(0, 100),
    hintSeconds: int(5, 300),
    hintAttempts: int(1, 10),
    modes: z.array(z.enum(MODES)).min(1, "Activa al menos una modalidad"),
  })
  .superRefine((config, ctx) => {
    const fail = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    if (config.minOranges > config.maxOranges) fail("minOranges", "El mínimo de naranjas no puede superar al máximo");
    if (config.minBaskets > config.maxBaskets) fail("minBaskets", "El mínimo de cestos no puede superar al máximo");
    if (config.primePct + config.exactPct > 100) {
      fail("primePct", "Primos y repartos exactos no pueden sumar más de 100 %");
    }
    if (ctx.issues.length > 0) return;
    const pools = candidatePairs(config);
    if (config.primePct > 0 && pools.prime.length === 0) {
      fail("primePct", "No hay ningún número primo en ese rango de naranjas con más naranjas que cestos");
    }
    if (config.exactPct > 0 && pools.exact.length === 0) {
      fail("exactPct", "Con esos rangos no existe ningún reparto exacto");
    }
    if (config.primePct + config.exactPct < 100 && pools.inexact.length === 0) {
      fail("exactPct", "Con esos rangos no existe ningún reparto inexacto con un número compuesto; sube los otros porcentajes a 100 %");
    }
  });

export type NaranjasConfig = z.infer<typeof naranjasSchema>;

export const naranjasDefaults: NaranjasConfig = {
  minOranges: 6,
  maxOranges: 30,
  minBaskets: 2,
  maxBaskets: 8,
  primePct: 25,
  exactPct: 50,
  hintSeconds: 30,
  hintAttempts: 2,
  modes: ["drag", "group"],
};

export const naranjasAdminFields: AdminField[] = [
  { key: "minOranges", label: "Mínimo de naranjas", type: "number", min: 3, max: 40 },
  { key: "maxOranges", label: "Máximo de naranjas", type: "number", min: 3, max: 40, help: "Más de 40 dificulta verlas en pantalla" },
  { key: "minBaskets", label: "Mínimo de cestos", type: "number", min: 2, max: 10 },
  { key: "maxBaskets", label: "Máximo de cestos", type: "number", min: 2, max: 10 },
  { key: "primePct", label: "Frecuencia de números primos", type: "number", min: 0, max: 100, step: 5, unit: "%" },
  { key: "exactPct", label: "Frecuencia de repartos exactos", type: "number", min: 0, max: 100, step: 5, unit: "%", help: "El resto son repartos inexactos con números no primos" },
  { key: "hintSeconds", label: "Segundos sin mover antes de ofrecer una pista", type: "number", min: 5, max: 300, step: 5, unit: "s" },
  { key: "hintAttempts", label: "Comprobaciones fallidas antes de ofrecer ayuda", type: "number", min: 1, max: 10 },
  {
    key: "modes",
    label: "Modalidades disponibles",
    type: "multi",
    options: [
      { value: "drag", label: "Arrastrar" },
      { value: "group", label: "Agrupar" },
    ],
  },
];
