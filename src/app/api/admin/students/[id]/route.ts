import { z } from "zod";
import { fail, json, readBody } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { resetPassword, setActive } from "@/lib/students";

export const dynamic = "force-dynamic";

const schema = z.object({ action: z.enum(["reset", "activate", "deactivate"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  const body = await readBody(request, schema);
  if ("response" in body) return body.response;

  if (body.data.action === "reset") {
    const credential = await resetPassword(id);
    return credential ? json({ credential }) : fail("Alumno no encontrado", 404);
  }
  const found = await setActive(id, body.data.action === "activate");
  return found ? json({ ok: true }) : fail("Alumno no encontrado", 404);
}
