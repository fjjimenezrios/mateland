import { readConfigSafe, writeConfig } from "./store";

export async function readAdminHash(): Promise<string | null> {
  const stored = (await readConfigSafe(["admin"])).admin as { passwordHash?: string } | undefined;
  return stored?.passwordHash ?? process.env.ADMIN_PASSWORD_HASH ?? null;
}

export const writeAdminHash = (passwordHash: string) => writeConfig("admin", { passwordHash });
