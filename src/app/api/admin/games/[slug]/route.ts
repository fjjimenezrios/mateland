import { z } from "zod";
import { configKey, getGame, parseGameState } from "@/games/registry";
import { fail, json, readBody } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { readConfig, StoreUnavailableError, writeConfig } from "@/lib/store";

export const dynamic = "force-dynamic";

const schema = z.object({ enabled: z.boolean(), config: z.unknown() });

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  if (!getGame(slug)) return fail("Juego no encontrado", 404);
  const raw = await readConfig([configKey(slug)], { fresh: true });
  return json(parseGameState(slug, raw[configKey(slug)]));
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  const game = getGame(slug);
  if (!game) return fail("Juego no encontrado", 404);
  const body = await readBody(request, schema);
  if ("response" in body) return body.response;

  const parsed = game.configSchema.safeParse(body.data.config);
  if (!parsed.success) {
    const errors = Object.fromEntries(parsed.error.issues.map((issue) => [String(issue.path[0] ?? "_"), issue.message]));
    return json({ error: "Configuración no válida", errors }, 400);
  }
  const state = { enabled: body.data.enabled, config: parsed.data };
  try {
    await writeConfig(configKey(slug), state);
  } catch (error) {
    if (error instanceof StoreUnavailableError) return fail(error.message, 503);
    throw error;
  }
  return json(state);
}
