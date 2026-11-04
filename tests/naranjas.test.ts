import { describe, expect, it } from "vitest";
import { isPrime } from "@/lib/math";
import { mulberry32 } from "@/lib/rng";
import { naranjasDefaults, naranjasSchema, type NaranjasConfig } from "@/games/naranjas/config";
import { emptyPlacement, evaluate, moveOranges, solution, surplusZone } from "@/games/naranjas/engine";
import { generateChallenge } from "@/games/naranjas/generator";
import { hintText, primeNote, successMessage, verdictMessage } from "@/games/naranjas/texts";

const config = (patch: Partial<NaranjasConfig> = {}) => ({ ...naranjasDefaults, ...patch });

describe("config validation", () => {
  it("accepts the defaults", () => {
    expect(naranjasSchema.safeParse(naranjasDefaults).success).toBe(true);
  });
  it("rejects min greater than max", () => {
    expect(naranjasSchema.safeParse(config({ minOranges: 20, maxOranges: 10 })).success).toBe(false);
    expect(naranjasSchema.safeParse(config({ minBaskets: 6, maxBaskets: 3 })).success).toBe(false);
  });
  it("rejects percentages above 100", () => {
    expect(naranjasSchema.safeParse(config({ primePct: 60, exactPct: 50 })).success).toBe(false);
  });
  it("rejects a range without primes when primes are requested", () => {
    const result = naranjasSchema.safeParse(config({ minOranges: 24, maxOranges: 28, primePct: 25 }));
    expect(result.success).toBe(false);
    expect(naranjasSchema.safeParse(config({ minOranges: 24, maxOranges: 28, primePct: 0, exactPct: 50 })).success).toBe(true);
  });
  it("rejects ranges without any inexact split when they are needed", () => {
    expect(naranjasSchema.safeParse(config({ minOranges: 4, maxOranges: 4, minBaskets: 2, maxBaskets: 2, primePct: 0, exactPct: 50 })).success).toBe(false);
  });
  it("rejects values out of bounds and no modes", () => {
    expect(naranjasSchema.safeParse(config({ maxOranges: 80 })).success).toBe(false);
    expect(naranjasSchema.safeParse(config({ modes: [] })).success).toBe(false);
    expect(naranjasSchema.safeParse(config({ minBaskets: 1 })).success).toBe(false);
  });
});

describe("generator", () => {
  it("stays inside the configured limits and never uses more oranges than baskets inverted", () => {
    const rng = mulberry32(1);
    const cfg = config({ minOranges: 8, maxOranges: 20, minBaskets: 3, maxBaskets: 5 });
    for (let i = 0; i < 500; i++) {
      const c = generateChallenge(cfg, rng);
      expect(c.oranges).toBeGreaterThanOrEqual(8);
      expect(c.oranges).toBeLessThanOrEqual(20);
      expect(c.baskets).toBeGreaterThanOrEqual(3);
      expect(c.baskets).toBeLessThanOrEqual(5);
      expect(c.oranges).toBeGreaterThan(c.baskets);
    }
  });
  it("labels each category correctly", () => {
    const rng = mulberry32(2);
    for (let i = 0; i < 500; i++) {
      const c = generateChallenge(naranjasDefaults, rng);
      if (c.category === "prime") {
        expect(isPrime(c.oranges)).toBe(true);
        expect(solution(c.oranges, c.baskets).exact).toBe(false);
      } else if (c.category === "exact") {
        expect(isPrime(c.oranges)).toBe(false);
        expect(c.oranges % c.baskets).toBe(0);
      } else {
        expect(isPrime(c.oranges)).toBe(false);
        expect(c.oranges % c.baskets).not.toBe(0);
      }
    }
  });
  it("roughly follows the configured frequencies", () => {
    const rng = mulberry32(3);
    const counts = { prime: 0, exact: 0, inexact: 0 };
    const total = 4000;
    for (let i = 0; i < total; i++) counts[generateChallenge(naranjasDefaults, rng).category]++;
    expect(counts.prime / total).toBeGreaterThan(0.2);
    expect(counts.prime / total).toBeLessThan(0.3);
    expect(counts.exact / total).toBeGreaterThan(0.45);
    expect(counts.exact / total).toBeLessThan(0.55);
    expect(counts.inexact / total).toBeGreaterThan(0.2);
  });
  it("does not repeat the previous challenge when alternatives exist", () => {
    const rng = mulberry32(4);
    let previous = generateChallenge(naranjasDefaults, rng);
    for (let i = 0; i < 300; i++) {
      const next = generateChallenge(naranjasDefaults, rng, previous.key);
      expect(next.key).not.toBe(previous.key);
      previous = next;
    }
  });
  it("repeats only when there is a single possible challenge", () => {
    const only = config({ minOranges: 5, maxOranges: 5, minBaskets: 2, maxBaskets: 2, primePct: 100, exactPct: 0 });
    expect(generateChallenge(only, mulberry32(5), "5x2").key).toBe("5x2");
  });
  it("respects a 100% exact configuration", () => {
    const cfg = config({ primePct: 0, exactPct: 100 });
    const rng = mulberry32(6);
    for (let i = 0; i < 200; i++) expect(generateChallenge(cfg, rng).category).toBe("exact");
  });
});

describe("engine", () => {
  it("solves an exact split: 16 oranges in 4 baskets", () => {
    let placement = emptyPlacement(16);
    expect(evaluate(placement, 4).status).toBe("pending");
    for (let i = 0; i < 16; i++) placement = moveOranges(placement, [i], i % 4);
    expect(evaluate(placement, 4)).toMatchObject({ status: "correct", surplus: 0, perBasket: [4, 4, 4, 4] });
  });
  it("detects unequal baskets", () => {
    let placement = emptyPlacement(8);
    placement = moveOranges(placement, [0, 1, 2, 3, 4], 0);
    placement = moveOranges(placement, [5, 6, 7], 1);
    expect(evaluate(placement, 2).status).toBe("unequal");
  });
  it("accepts the surplus on an inexact split: 7 oranges in 2 baskets", () => {
    let placement = emptyPlacement(7);
    placement = moveOranges(placement, [0, 1, 2], 0);
    placement = moveOranges(placement, [3, 4, 5], 1);
    expect(evaluate(placement, 2).status).toBe("pending");
    placement = moveOranges(placement, [6], surplusZone(2));
    expect(evaluate(placement, 2)).toMatchObject({ status: "correct", surplus: 1 });
  });
  it("asks to keep sharing when leftovers could still be distributed", () => {
    let placement = emptyPlacement(7);
    placement = moveOranges(placement, [0, 1], 0);
    placement = moveOranges(placement, [2, 3], 1);
    placement = moveOranges(placement, [4, 5, 6], surplusZone(2));
    expect(evaluate(placement, 2).status).toBe("more");
  });
  it("treats everything in the surplus zone as not finished", () => {
    const placement = moveOranges(emptyPlacement(7), Array.from({ length: 7 }, (_, i) => i), surplusZone(3));
    expect(evaluate(placement, 3).status).toBe("more");
  });
  it("accepts every valid outcome for every challenge and rejects any other leftover", () => {
    for (let n = 3; n <= 40; n++) {
      for (let c = 2; c < n && c <= 10; c++) {
        const { each, surplus } = solution(n, c);
        const placement = emptyPlacement(n);
        let next = 0;
        for (let b = 0; b < c; b++) for (let k = 0; k < each; k++) placement[next++] = b;
        for (; next < n; next++) placement[next] = surplusZone(c);
        expect(evaluate(placement, c).status).toBe("correct");
        expect(evaluate(placement, c).surplus).toBe(surplus);
      }
    }
  });
});

describe("texts", () => {
  it("explains an exact split", () => {
    expect(successMessage(16, 4)).toContain("4 es divisor de 16");
    expect(successMessage(16, 4)).toContain("sin que sobre ninguna");
  });
  it("explains an inexact split", () => {
    expect(successMessage(7, 2)).toContain("2 no es divisor de 7");
    expect(successMessage(7, 2)).toContain("sobra una");
  });
  it("bases primality on divisors, not on the baskets shown", () => {
    expect(primeNote(7)).toContain("7 es un número primo");
    expect(primeNote(9)).toContain("9 no es primo");
    expect(primeNote(9)).toContain("3");
  });
  it("gives progressive hints and distinguishes verdicts", () => {
    expect(hintText(1, 7, 2)).toContain("misma cantidad");
    expect(hintText(2, 7, 2)).toContain("no puedes repartir");
    expect(hintText(3, 7, 2)).toContain("sobran 1");
    expect(hintText(3, 16, 4)).toContain("no sobra ninguna");
    expect(new Set(Object.values(verdictMessage)).size).toBe(3);
  });
});
