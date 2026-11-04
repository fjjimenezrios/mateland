import { json, sameOrigin, fail } from "@/lib/http";
import { clearSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Origen no permitido", 403);
  await clearSession();
  return json({ ok: true });
}
