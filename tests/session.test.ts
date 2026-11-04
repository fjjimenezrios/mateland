import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession } from "@/lib/session";
import { generateAdminPassword, generateStudentPassword, hashPassword, verifyPassword } from "@/lib/password";

describe("session cookie", () => {
  it("round-trips a signed session", () => {
    const token = encodeSession({ role: "student", sub: "s1", name: "lucia-m" });
    expect(decodeSession(token)).toEqual({ role: "student", sub: "s1", name: "lucia-m" });
  });
  it("rejects tampering and garbage", () => {
    const token = encodeSession({ role: "student", sub: "s1" });
    const [body, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ role: "admin", sub: "s1", exp: 9999999999 })).toString("base64url");
    expect(decodeSession(`${forged}.${signature}`)).toBeNull();
    expect(decodeSession(`${body}.abc`)).toBeNull();
    expect(decodeSession("nope")).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
  });
  it("expires", () => {
    const token = encodeSession({ role: "admin", sub: "admin" }, Date.now());
    expect(decodeSession(token, Date.now() + 7 * 3600 * 1000)).not.toBeNull();
    expect(decodeSession(token, Date.now() + 9 * 3600 * 1000)).toBeNull();
  });
});

describe("passwords", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("naranja-cesto-sol-47");
    expect(await verifyPassword("naranja-cesto-sol-47", hash)).toBe(true);
    expect(await verifyPassword("naranja-cesto-sol-48", hash)).toBe(false);
    expect(await verifyPassword("x", "garbage")).toBe(false);
  });
  it("salts every hash", async () => {
    expect(await hashPassword("a")).not.toBe(await hashPassword("a"));
  });
  it("generates readable passwords", () => {
    expect(generateStudentPassword()).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{2}$/);
    expect(generateAdminPassword().length).toBeGreaterThan(24);
  });
});
