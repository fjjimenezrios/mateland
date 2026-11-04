import { mulberry32 } from "@/lib/rng";
import type { GameDefinition } from "../types";
import { type ArbolConfig, arbolAdminFields, arbolDefaults, arbolSchema } from "./config";
import { factorizationText } from "./engine";
import { generateArbol } from "./generator";

export const arbol: GameDefinition<ArbolConfig> = {
  slug: "arbol",
  title: "Árbol de factores",
  topic: "Factores primos",
  tagline: "Parte cada número en dos hasta que todas las bolas sean doradas.",
  theme: { from: "#d9f99d", via: "#22c55e", to: "#052e16", accent: "#a3e635", ink: "#14532d" },
  configSchema: arbolSchema,
  defaults: arbolDefaults,
  adminFields: arbolAdminFields,
  previewExamples: (config, count) => {
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    return Array.from({ length: count }, () => {
      const { n } = generateArbol(config, rng);
      return `Descomponer ${n} = ${factorizationText(n)}`;
    });
  },
};
