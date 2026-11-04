import { accountsEnabled } from "@/lib/games-store";
import { json } from "@/lib/http";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const [enabled, session] = await Promise.all([accountsEnabled(), getSession()]);
  return json({
    accountsEnabled: enabled,
    student: enabled && session?.role === "student" ? { username: session.name } : null,
    admin: session?.role === "admin",
  });
}
