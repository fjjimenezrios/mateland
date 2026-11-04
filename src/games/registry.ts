import type { GameDefinition } from "./types";
import { arbol } from "./arbol";
import { cazaDivisores } from "./caza-divisores";
import { criba } from "./criba";
import { criterios } from "./criterios";
import { mcd } from "./mcd";
import { mcm } from "./mcm";
import { naranjas } from "./naranjas";

export const games = [naranjas, cazaDivisores, criba, criterios, arbol, mcd, mcm] as unknown as GameDefinition<never>[];

export const getGame = (slug: string) => games.find((game) => game.slug === slug);
export const configKey = (slug: string) => `game_${slug}`;

export type GameState = { enabled: boolean; config: unknown };

export function parseGameState(slug: string, raw: unknown): GameState {
  const game = getGame(slug);
  if (!game) throw new Error(`Juego desconocido: ${slug}`);
  const stored = (raw ?? {}) as Partial<GameState>;
  const parsed = game.configSchema.safeParse(stored.config);
  return {
    enabled: stored.enabled !== false,
    config: parsed.success ? parsed.data : game.defaults,
  };
}
