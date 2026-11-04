import { configKey, games, parseGameState, type GameState } from "@/games/registry";
import { readConfig, readConfigSafe } from "./store";

export async function readGameStates(options: { fresh?: boolean } = {}): Promise<Record<string, GameState>> {
  const keys = games.map((game) => configKey(game.slug));
  const raw = options.fresh ? await readConfig(keys, { fresh: true }) : await readConfigSafe(keys);
  return Object.fromEntries(games.map((game) => [game.slug, parseGameState(game.slug, raw[configKey(game.slug)])]));
}

export async function readGameState(slug: string): Promise<GameState> {
  const raw = await readConfigSafe([configKey(slug)]);
  return parseGameState(slug, raw[configKey(slug)]);
}

export async function accountsEnabled(): Promise<boolean> {
  const raw = await readConfigSafe(["accounts_enabled"]);
  return raw.accounts_enabled === true;
}
