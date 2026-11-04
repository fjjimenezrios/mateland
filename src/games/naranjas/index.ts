import { mulberry32 } from "@/lib/rng";
import type { GameDefinition } from "../types";
import { type NaranjasConfig, naranjasAdminFields, naranjasDefaults, naranjasSchema } from "./config";
import { generateChallenge } from "./generator";
import { solution } from "./engine";

export const naranjas: GameDefinition<NaranjasConfig> = {
  slug: "naranjas",
  title: "Las naranjas y los cestos",
  topic: "Divisibilidad",
  tagline: "Reparte las naranjas y descubre cuándo un número es divisor de otro.",
  theme: { from: "#ffb347", via: "#ff7e5f", to: "#6a3093", accent: "#ff8a1f", ink: "#3b1d00" },
  configSchema: naranjasSchema,
  defaults: naranjasDefaults,
  adminFields: naranjasAdminFields,
  previewExamples: (config, count) => {
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    return Array.from({ length: count }, () => {
      const { oranges, baskets } = generateChallenge(config, rng);
      const { surplus, exact } = solution(oranges, baskets);
      return `${oranges} naranjas, ${baskets} cestos → ${exact ? "reparto exacto" : `sobran ${surplus}`}`;
    });
  },
};
