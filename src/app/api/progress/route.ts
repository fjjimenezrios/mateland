import { accountsEnabled } from "@/lib/games-store";
import { fail, json, readBody } from "@/lib/http";
import { progressDeltaSchema } from "@/lib/progress-shared";
import { clearSession, getSession } from "@/lib/session";
import { addProgress, isStudentActive, readProgress } from "@/lib/students";

export const dynamic = "force-dynamic";

async function activeStudent() {
  const session = await getSession();
  if (session?.role !== "student" || !(await accountsEnabled())) return null;
  if (!(await isStudentActive(session.sub))) {
    await clearSession();
    return null;
  }
  return session;
}

export async function GET() {
  const session = await activeStudent();
  if (!session) return fail("Sin sesión", 401);
  return json({ progress: await readProgress(session.sub) });
}

export async function POST(request: Request) {
  const body = await readBody(request, progressDeltaSchema);
  if ("response" in body) return body.response;
  const session = await activeStudent();
  if (!session) return fail("Sin sesión", 401);
  return json({ progress: await addProgress(session.sub, body.data) });
}
