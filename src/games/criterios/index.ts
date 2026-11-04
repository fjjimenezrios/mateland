import { mulberry32 } from "@/lib/rng";
import type { GameDefinition } from "../types";
import { type CriteriosConfig, criteriosAdminFields, criteriosDefaults, criteriosSchema } from "./config";
import { generateCriterios } from "./generator";

export const criterios: GameDefinition<CriteriosConfig> = {
  slug: "criterios",
  title: "Criterios de divisibilidad",
  topic: "Divisibilidad",
  tagline: "Mira las cifras y manda cada número a su tubo.",
  theme: { from: "#99f6e4", via: "#0d9488", to: "#134e4a", accent: "#2dd4bf", ink: "#042f2e" },
  configSchema: criteriosSchema,
  defaults: criteriosDefaults,
  adminFields: criteriosAdminFields,
  previewExamples: (config, count) => {
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    return Array.from({ length: count }, () => `Números: ${generateCriterios(config, rng).numbers.join(", ")}`);
  },
};
