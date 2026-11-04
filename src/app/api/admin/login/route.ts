import { z } from "zod";
import { readAdminHash } from "@/lib/admin-auth";
import { fail, json, pause, readBody } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().max(200) });

export async function POST(request: Request) {
  const body = await readBody(request, schema);
  if ("response" in body) return body.response;
  const hash = await readAdminHash();
  if (!hash) return fail("El administrador no está configurado todavía", 503);
  if (!(await verifyPassword(body.data.password, hash))) {
    await pause(800);
    return fail("Contraseña incorrecta", 401);
  }
  await setSession({ role: "admin", sub: "admin" });
  return json({ ok: true });
}
