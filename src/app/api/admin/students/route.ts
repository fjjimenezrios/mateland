import { fail, json } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { publicDirectory, readDirectory } from "@/lib/students";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  return json(publicDirectory(await readDirectory({ fresh: true })));
}
