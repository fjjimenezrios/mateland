import { fail, json, sameOrigin } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { deleteClass } from "@/lib/students";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!sameOrigin(request)) return fail("Origen no permitido", 403);
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  return (await deleteClass(id)) ? json({ ok: true }) : fail("Clase no encontrada", 404);
}
