import { randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const WORDS = [
  "naranja", "cesto", "sol", "luna", "rio", "mar", "pino", "roble", "nube", "trigo",
  "lince", "gato", "perro", "tigre", "koala", "panda", "rana", "pato", "oso", "lobo",
  "zorro", "burro", "vaca", "cabra", "mono", "pez", "ola", "isla", "monte", "valle",
  "campo", "huerto", "limon", "manzana", "pera", "uva", "fresa", "melon", "sandia",
  "cereza", "kiwi", "mango", "coco", "pan", "miel", "queso", "tarta", "flan", "nata",
  "cacao", "menta", "rosa", "lirio", "tulipan", "jazmin", "azul", "verde", "rojo",
  "plata", "oro", "viento", "lluvia", "nieve", "trueno",
];

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 32)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length)) as Buffer;
  return timingSafeEqual(derived, expected);
}

export function generateStudentPassword(): string {
  const words = Array.from({ length: 3 }, () => WORDS[randomInt(WORDS.length)]);
  return `${words.join("-")}-${randomInt(10, 100)}`;
}

export function generateAdminPassword(): string {
  return Array.from({ length: 5 }, () => WORDS[randomInt(WORDS.length)]).join("-") + `-${randomInt(1000, 10000)}`;
}
