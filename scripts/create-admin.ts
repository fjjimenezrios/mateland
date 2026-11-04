import { writeAdminHash } from "../src/lib/admin-auth";
import { generateAdminPassword, hashPassword } from "../src/lib/password";

async function main() {
  const password = process.argv[2] ?? generateAdminPassword();
  const hash = await hashPassword(password);
  try {
    await writeAdminHash(hash);
    console.log("Administrador guardado en Global Config.");
  } catch (error) {
    console.log(`No se pudo guardar automáticamente (${(error as Error).message}).`);
    console.log("Guarda este valor como variable de entorno ADMIN_PASSWORD_HASH en Vercel:");
    console.log(hash);
  }
  console.log(`\nContraseña del administrador: ${password}\n`);
}

main();
