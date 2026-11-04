import { mulberry32 } from "@/lib/rng";
import type { GameDefinition } from "../types";
import { type McdConfig, mcdAdminFields, mcdDefaults, mcdSchema } from "./config";
import { gcd } from "./engine";
import { generateMcd } from "./generator";

export const mcd: GameDefinition<McdConfig> = {
  slug: "mcd",
  title: "Baldosas: el mcd",
  topic: "Máximo común divisor",
  tagline: "Cubre el suelo con las baldosas cuadradas más grandes que quepan.",
  theme: { from: "#fecdd3", via: "#e11d48", to: "#4c0519", accent: "#fb7185", ink: "#4c0519" },
  configSchema: mcdSchema,
  defaults: mcdDefaults,
  adminFields: mcdAdminFields,
  previewExamples: (config, count) => {
    const rng = mulberry32(Math.floor(Math.random() * 2 ** 31));
    return Array.from({ length: count }, () => {
      const { width, height } = generateMcd(config, rng);
      return `Suelo de ${width} × ${height} m → baldosa de ${gcd(width, height)} m`;
    });
  },
};
