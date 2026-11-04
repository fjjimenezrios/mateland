import { z } from "zod";
import { fail, json, readBody } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { createClass } from "@/lib/students";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(1, "Pon un nombre a la clase").max(60),
  usernames: z.string().max(5000),
});

export async function POST(request: Request) {
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  const body = await readBody(request, schema);
  if ("response" in body) return body.response;
  const names = body.data.usernames.split("\n");
  if (names.length > 80) return fail("Máximo 80 alumnos por clase");
  const { schoolClass, credentials, rejected } = await createClass(body.data.name, names);
  if (credentials.length === 0) return fail("No hay ningún nombre de usuario válido (2 a 24 letras, números, punto o guion)");
  return json({ schoolClass, credentials, rejected }, 201);
}
