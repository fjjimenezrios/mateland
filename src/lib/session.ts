import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "mates_session";
const ADMIN_TTL_SECONDS = 8 * 3600;
const STUDENT_TTL_SECONDS = 30 * 24 * 3600;

export type Session = { role: "admin" | "student"; sub: string; name?: string };
type Payload = Session & { exp: number };

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production" && process.env.STORE_BACKEND !== "local") {
    throw new Error("SESSION_SECRET no está configurada");
  }
  return "dev-only-secret";
}

const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

export function encodeSession(session: Session, now = Date.now()): string {
  const ttl = session.role === "admin" ? ADMIN_TTL_SECONDS : STUDENT_TTL_SECONDS;
  const payload: Payload = { ...session, exp: Math.floor(now / 1000) + ttl };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSession(token: string | undefined, now = Date.now()): Session | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as Payload;
    if (payload.exp * 1000 < now) return null;
    return { role: payload.role, sub: payload.sub, name: payload.name };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  const maxAge = session.role === "admin" ? ADMIN_TTL_SECONDS : STUDENT_TTL_SECONDS;
  store.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.STORE_BACKEND !== "local",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function requireAdmin(): Promise<Session | null> {
  const session = await getSession();
  return session?.role === "admin" ? session : null;
}
