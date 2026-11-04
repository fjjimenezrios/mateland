import { getGame } from "@/games/registry";
import { fail, json } from "@/lib/http";
import { readGameState } from "@/lib/games-store";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getGame(slug)) return fail("Juego no encontrado", 404);
  return json(await readGameState(slug));
}
