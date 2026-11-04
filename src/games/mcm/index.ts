import { mulberry32 } from "@/lib/rng";
import type { GameDefinition } from "../types";
import { type McmConfig, mcmAdminFields, mcmDefaults, mcmSchema } from "./config";
import { lcm } from "./engine";
import { generateMcm } from "./generator";

export const mcm: GameDefinition<McmConfig> = {
  slug: "mcm",
  title: "Luces: el mcm",
  topic: "Mínimo común múltiplo",
  tagline: "Dos luces parpadean a su ritmo. ¿Cuándo lo hacen a la vez?",
  theme: { from: "#6366f1", via: "#312e81", to: "#020617", accent: "#facc15", ink: "#422006" },
  configSchema: mcmSchema,
  defaults: mcmDefaults,
  adminFields: mcmAdminFields,
  previewExamples: (config, count) => {
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    return Array.from({ length: count }, () => {
      const { a, b } = generateMcm(config, rng);
      return `Luces cada ${a} s y cada ${b} s → coinciden a los ${lcm(a, b)} s`;
    });
  },
};
