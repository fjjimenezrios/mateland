import { mulberry32 } from "@/lib/rng";
import type { GameDefinition } from "../types";
import { type CazaConfig, cazaAdminFields, cazaDefaults, cazaSchema } from "./config";
import { describeNumber, generateCaza } from "./generator";

export const cazaDivisores: GameDefinition<CazaConfig> = {
  slug: "caza-divisores",
  title: "Caza-divisores",
  topic: "Divisores y números primos",
  tagline: "Explota las burbujas que sean divisores del número.",
  theme: { from: "#38bdf8", via: "#2563eb", to: "#1e1b4b", accent: "#22d3ee", ink: "#04243a" },
  configSchema: cazaSchema,
  defaults: cazaDefaults,
  adminFields: cazaAdminFields,
  previewExamples: (config, count) => {
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    return Array.from({ length: count }, () => {
      const { n, targets } = generateCaza(config, rng);
      return `Número ${describeNumber(n)} → ${targets.length} divisores`;
    });
  },
};
