import type { ComponentType } from "react";
import type { z } from "zod";

export type GameResult = { solved: boolean; attempts: number; hintsUsed: number };

export type AdminField =
  | { key: string; label: string; help?: string; type: "number"; min: number; max: number; step?: number; unit?: string }
  | { key: string; label: string; help?: string; type: "multi"; options: { value: string; label: string }[] }
  | { key: string; label: string; help?: string; type: "toggle" };

export type GameTheme = { from: string; via: string; to: string; accent: string; ink: string };

export type GameProps<C> = {
  config: C;
  avoidKey?: string;
  onResult: (result: GameResult) => void;
  onNext: (challengeKey: string) => void;
};

export type GameDefinition<C> = {
  slug: string;
  title: string;
  topic: string;
  tagline: string;
  theme: GameTheme;
  configSchema: z.ZodType<C>;
  defaults: C;
  adminFields: AdminField[];
  previewExamples: (config: C, count: number) => string[];
};

export type GameUI<C> = {
  Cover: ComponentType;
  Game: ComponentType<GameProps<C>>;
};
