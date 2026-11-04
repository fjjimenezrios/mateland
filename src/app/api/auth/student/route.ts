import { z } from "zod";
import { accountsEnabled } from "@/lib/games-store";
import { fail, json, pause, readBody } from "@/lib/http";
import { setSession } from "@/lib/session";
import { authenticate } from "@/lib/students";

export const dynamic = "force-dynamic";

const schema = z.object({ username: z.string().max(60), password: z.string().max(120) });

export async function POST(request: Request) {
  const body = await readBody(request, schema);
  if ("response" in body) return body.response;
  if (!(await accountsEnabled())) return fail("El acceso con cuenta no está activado", 403);
  const student = await authenticate(body.data.username, body.data.password);
  if (!student) {
    await pause(400);
    return fail("Nombre o contraseña incorrectos", 401);
  }
  await setSession({ role: "student", sub: student.id, name: student.username });
  return json({ username: student.username });
}
