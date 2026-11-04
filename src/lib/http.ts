import type { ZodType } from "zod";

const NO_STORE = { "Cache-Control": "no-store" };

export const json = (data: unknown, status = 200) => Response.json(data, { status, headers: NO_STORE });
export const fail = (message: string, status = 400) => json({ error: message }, status);

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function readBody<T>(request: Request, schema: ZodType<T>): Promise<{ data: T } | { response: Response }> {
  if (!sameOrigin(request)) return { response: fail("Origen no permitido", 403) };
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return { response: fail("Tipo de contenido no válido", 415) };
  }
  const parsed = schema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) {
    return { response: json({ error: parsed.error.issues[0]?.message ?? "Datos no válidos", issues: parsed.error.issues }, 400) };
  }
  return { data: parsed.data };
}

export const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
