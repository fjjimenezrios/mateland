import { rm } from "node:fs/promises";

export const ADMIN_PASSWORD = "clave-de-prueba-del-profe";

export default async function globalSetup() {
  process.env.STORE_BACKEND = "local";
  process.env.DATA_DIR = ".data-test";
  await rm(".data-test", { recursive: true, force: true });
  const { writeAdminHash } = await import("../src/lib/admin-auth");
  const { hashPassword } = await import("../src/lib/password");
  await writeAdminHash(await hashPassword(ADMIN_PASSWORD));
}
