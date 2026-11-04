import { describe, expect, it } from "vitest";
import { divisors, isPrime } from "@/lib/math";
import { mulberry32 } from "@/lib/rng";
import { cazaDefaults, cazaSchema } from "@/games/caza-divisores/config";
import { generateCaza } from "@/games/caza-divisores/generator";
import { finalMessage, foundMessage, hintText, wrongMessage } from "@/games/caza-divisores/texts";

describe("caza-divisores config", () => {
  it("accepts defaults and rejects bad ranges", () => {
    expect(cazaSchema.safeParse(cazaDefaults).success).toBe(true);
    expect(cazaSchema.safeParse({ ...cazaDefaults, minNumber: 40, maxNumber: 10 }).success).toBe(false);
    expect(cazaSchema.safeParse({ ...cazaDefaults, minNumber: 24, maxNumber: 28, primePct: 20 }).success).toBe(false);
    expect(cazaSchema.safeParse({ ...cazaDefaults, minNumber: 60, maxNumber: 60, bubbles: 8, primePct: 0 }).success).toBe(false);
  });
});

describe("caza-divisores generator", () => {
  it("includes every divisor, only real divisors as targets, and the configured bubble count", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const c = generateCaza(cazaDefaults, rng);
      expect(c.n).toBeGreaterThanOrEqual(cazaDefaults.minNumber);
      expect(c.n).toBeLessThanOrEqual(cazaDefaults.maxNumber);
      expect(c.targets).toEqual(divisors(c.n));
      expect(c.bubbles).toHaveLength(cazaDefaults.bubbles);
      expect(new Set(c.bubbles).size).toBe(c.bubbles.length);
      for (const d of c.targets) expect(c.bubbles).toContain(d);
      expect(c.bubbles.length - c.targets.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("produces primes at about the configured rate", () => {
    const rng = mulberry32(8);
    let primes = 0;
    for (let i = 0; i < 2000; i++) if (isPrime(generateCaza(cazaDefaults, rng).n)) primes++;
    expect(primes / 2000).toBeGreaterThan(0.12);
    expect(primes / 2000).toBeLessThan(0.28);
  });
  it("avoids repeating the previous number", () => {
    const rng = mulberry32(9);
    let key = generateCaza(cazaDefaults, rng).key;
    for (let i = 0; i < 200; i++) {
      const next = generateCaza(cazaDefaults, rng, key);
      expect(next.key).not.toBe(key);
      key = next.key;
    }
  });
  it("works at the smallest range", () => {
    const c = generateCaza({ ...cazaDefaults, minNumber: 2, maxNumber: 3, primePct: 100 }, mulberry32(10));
    expect(c.targets).toEqual(divisors(c.n));
  });
});

describe("caza-divisores texts", () => {
  it("explains found and wrong bubbles", () => {
    expect(foundMessage(24, 4)).toContain("24 = 4 × 6");
    expect(wrongMessage(24, 5)).toContain("24 = 5 × 4 + 4");
    expect(wrongMessage(10, 12)).toContain("mayor");
  });
  it("explains primality from the divisor list", () => {
    expect(finalMessage(13, [1, 13])).toContain("primo");
    expect(finalMessage(12, [1, 2, 3, 4, 6, 12])).toContain("no es primo");
  });
  it("hints progress and ends with the pending divisor", () => {
    expect(hintText(1, 12, 3)).toContain("dividir");
    expect(hintText(2, 12, 3)).toContain("parejas");
    expect(hintText(3, 12, 3)).toContain("grupos de 3");
  });
});
