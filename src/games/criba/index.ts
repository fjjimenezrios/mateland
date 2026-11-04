import { mulberry32 } from "@/lib/rng";
import type { GameDefinition } from "../types";
import { type CribaConfig, cribaAdminFields, cribaDefaults, cribaSchema } from "./config";
import { generateCriba } from "./generator";

export const criba: GameDefinition<CribaConfig> = {
  slug: "criba",
  title: "Criba de Eratóstenes",
  topic: "Números primos",
  tagline: "Tacha los múltiplos y descubre qué números son primos.",
  theme: { from: "#c4b5fd", via: "#7c3aed", to: "#1e1b4b", accent: "#a78bfa", ink: "#2e1065" },
  configSchema: cribaSchema,
  defaults: cribaDefaults,
  adminFields: cribaAdminFields,
  previewExamples: (config, count) => {
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    return Array.from({ length: count }, () => `Tablero del 1 al ${generateCriba(config, rng).limit}`);
  },
};
