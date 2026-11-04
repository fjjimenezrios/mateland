import { z } from "zod";
import { readAdminHash, writeAdminHash } from "@/lib/admin-auth";
import { fail, json, pause, readBody } from "@/lib/http";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireAdmin } from "@/lib/session";
import { StoreUnavailableError } from "@/lib/store";

export const dynamic = "force-dynamic";

const schema = z.object({
  current: z.string().max(200),
  next: z.string().min(12, "La contraseña nueva debe tener al menos 12 caracteres").max(200),
});

export async function POST(request: Request) {
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  const body = await readBody(request, schema);
  if ("response" in body) return body.response;
  const hash = await readAdminHash();
  if (!hash || !(await verifyPassword(body.data.current, hash))) {
    await pause(800);
    return fail("La contraseña actual no es correcta", 401);
  }
  try {
    await writeAdminHash(await hashPassword(body.data.next));
  } catch (error) {
    if (error instanceof StoreUnavailableError) return fail(error.message, 503);
    throw error;
  }
  return json({ ok: true });
}
