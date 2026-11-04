import { z } from "zod";
import { fail, json, readBody } from "@/lib/http";
import { requireAdmin } from "@/lib/session";
import { readConfig, StoreUnavailableError, writeConfig } from "@/lib/store";

export const dynamic = "force-dynamic";

const schema = z.object({ accountsEnabled: z.boolean() });

export async function GET() {
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  const raw = await readConfig(["accounts_enabled"], { fresh: true });
  return json({ accountsEnabled: raw.accounts_enabled === true });
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return fail("No autorizado", 401);
  const body = await readBody(request, schema);
  if ("response" in body) return body.response;
  try {
    await writeConfig("accounts_enabled", body.data.accountsEnabled);
  } catch (error) {
    if (error instanceof StoreUnavailableError) return fail(error.message, 503);
    throw error;
  }
  return json(body.data);
}
