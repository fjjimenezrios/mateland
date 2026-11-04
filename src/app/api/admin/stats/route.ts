import { fail, json } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { readAllProgress, readDirectory } from "@/lib/students";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  const directory = await readDirectory({ fresh: true });
  const students = await readAllProgress(directory);
  return json({ classes: directory.classes, students, generatedAt: Date.now() });
}
