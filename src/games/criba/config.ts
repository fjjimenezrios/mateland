import { z } from "zod";
import type { AdminField } from "../types";

const int = (min: number, max: number) => z.number().int().min(min).max(max);

export const cribaSchema = z
  .object({
    minNumber: int(20, 100),
    maxNumber: int(20, 100),
    guided: z.boolean(),
    hintSeconds: int(5, 300),
    hintAttempts: int(1, 10),
  })
  .superRefine((config, ctx) => {
    if (config.minNumber > config.maxNumber) {
      ctx.addIssue({ code: "custom", path: ["minNumber"], message: "El mínimo no puede superar al máximo" });
    }
  });

export type CribaConfig = z.infer<typeof cribaSchema>;

export const cribaDefaults: CribaConfig = { minNumber: 50, maxNumber: 100, guided: false, hintSeconds: 30, hintAttempts: 3 };

export const cribaAdminFields: AdminField[] = [
  { key: "minNumber", label: "Tablero más pequeño (hasta el número…)", type: "number", min: 20, max: 100, step: 10 },
  { key: "maxNumber", label: "Tablero más grande (hasta el número…)", type: "number", min: 20, max: 100, step: 10, help: "Cada alumno recibe un tamaño al azar entre los dos" },
  { key: "guided", label: "Modo guiado", type: "toggle", help: "resalta siempre el siguiente número que toca" },
  { key: "hintSeconds", label: "Segundos sin tocar antes de ofrecer una pista", type: "number", min: 5, max: 300, step: 5, unit: "s" },
  { key: "hintAttempts", label: "Errores antes de ofrecer ayuda", type: "number", min: 1, max: 10 },
];
