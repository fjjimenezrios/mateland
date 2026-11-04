import { describe, expect, it } from "vitest";
import { divisors, isPrime } from "@/lib/math";
import { mulberry32 } from "@/lib/rng";
import { cribaDefaults, cribaSchema } from "@/games/criba/config";
import { createSieve, isFinished, pendingPrime, remainingPrimes, tapNumber, type SieveState } from "@/games/criba/engine";
import { generateCriba } from "@/games/criba/generator";
import { criteriosDefaults, criteriosSchema, matchingCriteria, numberPools, toCriteria, type Criterion } from "@/games/criterios/config";
import { explain, hintText as criteriosHint, noneMessage } from "@/games/criterios/engine";
import { generateCriterios } from "@/games/criterios/generator";
import { arbolDefaults, arbolSchema } from "@/games/arbol/config";
import {
  createTree, declarePrime, factorizationText, factorPairs, isComplete, layoutTree, leaves, primeFactors, splitNode, type Tree,
} from "@/games/arbol/engine";
import { generateArbol } from "@/games/arbol/generator";
import { compositeAsPrime, finalMessage as arbolFinal, splitPrime } from "@/games/arbol/texts";
import { mcdDefaults, mcdSchema } from "@/games/mcd/config";
import { coverage, gcd, judge } from "@/games/mcd/engine";
import { generateMcd } from "@/games/mcd/generator";
import { cutsMessage, hintText as mcdHint, successMessage as mcdSuccess } from "@/games/mcd/texts";
import { mcmDefaults, mcmSchema } from "@/games/mcm/config";
import { isLit, judgeClaim, lcm, multiples } from "@/games/mcm/engine";
import { generateMcm } from "@/games/mcm/generator";
import { hintText as mcmHint, missingMessage, successMessage as mcmSuccess } from "@/games/mcm/texts";
import { games, getGame } from "@/games/registry";

function runSieve(limit: number): SieveState {
  let state = createSieve(limit);
  for (let pending = pendingPrime(state); pending !== null; pending = pendingPrime(state)) {
    const result = tapNumber(state, pending);
    if (result.kind !== "ok") throw new Error("el siguiente número pendiente debe aceptarse");
    state = result.state;
  }
  return state;
}

describe("criba", () => {
  it("leaves exactly the primes once every prime up to the square root has been used", () => {
    for (const limit of [20, 30, 49, 50, 64, 97, 100]) {
      const state = runSieve(limit);
      expect(isFinished(state)).toBe(true);
      expect(remainingPrimes(state)).toEqual(Array.from({ length: limit - 1 }, (_, i) => i + 2).filter(isPrime));
      expect(state.picked.every((p) => isPrime(p) && p * p <= limit)).toBe(true);
    }
  });
  it("tags every crossed number with its smallest prime factor", () => {
    const state = runSieve(100);
    for (const [number, by] of Object.entries(state.crossedBy)) expect(primeFactors(Number(number))[0]).toBe(by);
  });
  it("explains the different kinds of wrong taps without changing state", () => {
    const first = tapNumber(createSieve(50), 2);
    if (first.kind !== "ok") throw new Error("2 debe aceptarse");
    expect(first.crossed).toEqual(Array.from({ length: 24 }, (_, i) => (i + 2) * 2));
    expect(tapNumber(createSieve(50), 1)).toEqual({ kind: "one" });
    expect(tapNumber(createSieve(50), 5)).toEqual({ kind: "early", pending: 2 });
    expect(tapNumber(first.state, 6)).toEqual({ kind: "crossed", by: 2 });
    expect(tapNumber(first.state, 2)).toEqual({ kind: "already" });
    expect(tapNumber(first.state, 9)).toEqual({ kind: "early", pending: 3 });
    expect(tapNumber(runSieve(50), 11)).toEqual({ kind: "finished" });
  });
  it("only asks for primes whose square fits in the board", () => {
    expect(runSieve(50).picked).toEqual([2, 3, 5, 7]);
    expect(runSieve(30).picked).toEqual([2, 3, 5]);
    expect(runSieve(100).picked).toEqual([2, 3, 5, 7]);
  });
  it("generates boards inside the range in tens and avoids repeating", () => {
    const rng = mulberry32(11);
    let key: string | undefined;
    for (let i = 0; i < 100; i++) {
      const c = generateCriba({ ...cribaDefaults, minNumber: 40, maxNumber: 80 }, rng, key);
      expect([40, 50, 60, 70, 80]).toContain(c.limit);
      expect(c.key).not.toBe(key);
      key = c.key;
    }
    expect(generateCriba({ ...cribaDefaults, minNumber: 33, maxNumber: 37 }, rng).limit).toBeGreaterThanOrEqual(33);
  });
  it("validates its config", () => {
    expect(cribaSchema.safeParse(cribaDefaults).success).toBe(true);
    expect(cribaSchema.safeParse({ ...cribaDefaults, minNumber: 90, maxNumber: 40 }).success).toBe(false);
    expect(cribaSchema.safeParse({ ...cribaDefaults, maxNumber: 500 }).success).toBe(false);
    expect(cribaSchema.safeParse({ ...cribaDefaults, guided: "sí" }).success).toBe(false);
  });
});

describe("criterios", () => {
  const all: Criterion[] = [2, 3, 4, 5, 6, 9, 10, 11];
  it("explanations always agree with real divisibility", () => {
    for (let n = 10; n <= 3000; n++) {
      for (const d of all) {
        const result = explain(n, d);
        expect(result.ok, `${n} ÷ ${d}`).toBe(n % d === 0);
        expect(result.text).toContain(String(n));
        expect(result.text).toContain(result.ok ? "es divisible" : "no es divisible");
      }
    }
  });
  it("shows the working for digit sums and alternating sums", () => {
    expect(explain(123, 3).text).toContain("1 + 2 + 3 = 6");
    expect(explain(124, 3).text).toContain("no es múltiplo de 3");
    expect(explain(918082, 11).text).toContain("2 − 8 + 0 − 8 + 1 − 9 = -22");
    expect(explain(918082, 11).ok).toBe(true);
    expect(explain(7, 6).text).toContain("ni entre 2 ni entre 3");
    expect(explain(8, 6).text).toContain("entre 3");
  });
  it("generates distinct numbers in range with the requested share of 'none'", () => {
    const rng = mulberry32(21);
    let none = 0;
    let total = 0;
    for (let i = 0; i < 400; i++) {
      const c = generateCriterios(criteriosDefaults, rng);
      expect(c.numbers).toHaveLength(5);
      expect(new Set(c.numbers).size).toBe(5);
      for (const n of c.numbers) {
        expect(n).toBeGreaterThanOrEqual(20);
        expect(n).toBeLessThanOrEqual(999);
        total++;
        if (matchingCriteria(n, c.criteria).length === 0) none++;
      }
    }
    expect(none / total).toBeGreaterThan(0.14);
    expect(none / total).toBeLessThan(0.27);
  });
  it("respects nonePct 0 and 100 and the chosen criteria", () => {
    const rng = mulberry32(22);
    for (let i = 0; i < 100; i++) {
      const zero = generateCriterios({ ...criteriosDefaults, nonePct: 0, criteria: ["3"] }, rng);
      for (const n of zero.numbers) expect(n % 3).toBe(0);
      const only = generateCriterios({ ...criteriosDefaults, nonePct: 100, criteria: ["2", "5"] }, rng);
      for (const n of only.numbers) expect(n % 2 !== 0 && n % 5 !== 0).toBe(true);
    }
  });
  it("validates its config including impossible ranges", () => {
    expect(criteriosSchema.safeParse(criteriosDefaults).success).toBe(true);
    expect(criteriosSchema.safeParse({ ...criteriosDefaults, criteria: [] }).success).toBe(false);
    expect(criteriosSchema.safeParse({ ...criteriosDefaults, criteria: ["7"] }).success).toBe(false);
    expect(criteriosSchema.safeParse({ ...criteriosDefaults, minNumber: 500, maxNumber: 100 }).success).toBe(false);
    expect(criteriosSchema.safeParse({ ...criteriosDefaults, minNumber: 20, maxNumber: 22, numbersPerRound: 5 }).success).toBe(false);
    expect(criteriosSchema.safeParse({ ...criteriosDefaults, minNumber: 20, maxNumber: 30, criteria: ["2", "3", "5"], nonePct: 20 }).success).toBe(true);
    expect(criteriosSchema.safeParse({ ...criteriosDefaults, minNumber: 24, maxNumber: 28, numbersPerRound: 3, criteria: ["2", "3", "5"], nonePct: 20 }).success).toBe(false);
    expect(criteriosSchema.safeParse({ ...criteriosDefaults, minNumber: 30, maxNumber: 36, numbersPerRound: 3, criteria: ["2", "3", "5"], nonePct: 20 }).success).toBe(true);
  });
  it("builds pools and hints", () => {
    const pools = numberPools(10, 20, toCriteria(["2", "3", "5"]));
    expect(pools.none).toEqual([11, 13, 17, 19]);
    expect(criteriosHint(3, 15, [2, 3, 5], [3])).toContain("÷3");
    expect(criteriosHint(3, 11, [2, 3], [])).toContain("Ninguno");
    expect(noneMessage(12, [2, 3])).toContain("2 y entre 3");
  });
});

describe("arbol", () => {
  it("lists factor pairs and prime factors", () => {
    expect(factorPairs(12)).toEqual([[2, 6], [3, 4]]);
    expect(factorPairs(7)).toEqual([]);
    expect(factorPairs(36)).toEqual([[2, 18], [3, 12], [4, 9], [6, 6]]);
    expect(primeFactors(60)).toEqual([2, 2, 3, 5]);
    expect(primeFactors(97)).toEqual([97]);
    expect(factorizationText(60)).toBe("2² × 3 × 5");
    expect(factorizationText(1024)).toBe("2¹⁰");
  });
  it("accepts valid splits and rejects invalid ones", () => {
    const tree = createTree(12);
    const split = splitNode(tree, 0, 3);
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(split.tree.map((n) => n.value)).toEqual([12, 3, 4]);
    expect(splitNode(split.tree, 0, 2)).toEqual({ ok: false, reason: "done" });
    expect(splitNode(createTree(12), 0, 5)).toEqual({ ok: false, reason: "invalid" });
    expect(splitNode(createTree(12), 0, 12)).toEqual({ ok: false, reason: "invalid" });
    expect(splitNode(createTree(12), 0, 1)).toEqual({ ok: false, reason: "invalid" });
    expect(splitNode(createTree(13), 0, 1)).toEqual({ ok: false, reason: "prime" });
    expect(splitPrime(13)).toContain("1 × 13");
  });
  it("only lets primes be declared prime", () => {
    expect(declarePrime(createTree(12), 0)).toEqual({ ok: false, reason: "composite", pair: [2, 6] });
    expect(compositeAsPrime(12, [2, 6])).toContain("12 = 2 × 6");
    const done = declarePrime(createTree(13), 0);
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(isComplete(done.tree)).toBe(true);
      expect(declarePrime(done.tree, 0)).toEqual({ ok: false, reason: "done" });
    }
  });
  it("always ends with the same prime factors whatever way it is split", () => {
    const rng = mulberry32(31);
    for (let n = 4; n <= 300; n++) {
      for (let trial = 0; trial < 3; trial++) {
        let tree: Tree = createTree(n);
        for (let guard = 0; guard < 100 && !isComplete(tree); guard++) {
          const open = leaves(tree).find((node) => !node.prime)!;
          const pairs = factorPairs(open.value);
          if (pairs.length === 0) {
            const next = declarePrime(tree, open.id);
            if (!next.ok) throw new Error("un primo debe aceptarse");
            tree = next.tree;
          } else {
            const next = splitNode(tree, open.id, pairs[Math.floor(rng() * pairs.length)][0]);
            if (!next.ok) throw new Error("un par válido debe aceptarse");
            tree = next.tree;
          }
        }
        expect(isComplete(tree)).toBe(true);
        const leafValues = leaves(tree).map((node) => node.value).sort((a, b) => a - b);
        expect(leafValues).toEqual(primeFactors(n));
        for (const node of tree) if (node.children) expect(tree[node.children[0]].value * tree[node.children[1]].value).toBe(node.value);
      }
    }
  });
  it("lays the tree out without overlapping leaves and with centred parents", () => {
    let tree = createTree(120);
    for (const [id, factor] of [[0, 10], [2, 3], [4, 2], [1, 2]] as const) {
      const next = splitNode(tree, id, factor);
      if (!next.ok) throw new Error(`split ${id}`);
      tree = next.tree;
    }
    const { positions, width, height } = layoutTree(tree, 86, 96, 32);
    const leafXs = leaves(tree).map((n) => positions[n.id].x).sort((a, b) => a - b);
    for (let i = 1; i < leafXs.length; i++) expect(leafXs[i] - leafXs[i - 1]).toBeGreaterThanOrEqual(86);
    for (const node of tree) {
      expect(positions[node.id].x).toBeGreaterThan(0);
      expect(positions[node.id].x).toBeLessThan(width);
      expect(positions[node.id].y).toBeLessThan(height);
      if (node.children) {
        const [a, b] = node.children;
        expect(positions[node.id].x).toBeCloseTo((positions[a].x + positions[b].x) / 2);
        expect(positions[a].y).toBeGreaterThan(positions[node.id].y);
      }
    }
  });
  it("generates numbers with enough prime factors and validates its config", () => {
    const rng = mulberry32(32);
    for (let i = 0; i < 200; i++) {
      const { n } = generateArbol(arbolDefaults, rng);
      expect(n).toBeGreaterThanOrEqual(12);
      expect(n).toBeLessThanOrEqual(120);
      expect(primeFactors(n).length).toBeGreaterThanOrEqual(3);
    }
    expect(arbolSchema.safeParse(arbolDefaults).success).toBe(true);
    expect(arbolSchema.safeParse({ ...arbolDefaults, minNumber: 100, maxNumber: 20 }).success).toBe(false);
    expect(arbolSchema.safeParse({ ...arbolDefaults, minNumber: 4, maxNumber: 7, minFactors: 3 }).success).toBe(false);
    expect(arbolFinal(60)).toContain("2² × 3 × 5");
  });
});

describe("mcd", () => {
  it("computes gcd and tile coverage", () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(7, 13)).toBe(1);
    expect(coverage(12, 18, 6)).toMatchObject({ cols: 2, rows: 3, tiles: 6, exact: true });
    expect(coverage(12, 18, 5)).toMatchObject({ cols: 2, rows: 3, leftoverX: 2, leftoverY: 3, exact: false });
  });
  it("judges every possible tile size correctly", () => {
    for (const [w, h] of [[12, 18], [20, 8], [7, 13], [24, 36], [9, 6]]) {
      const g = gcd(w, h);
      for (let side = 1; side <= Math.min(w, h); side++) {
        const claim = judge(w, h, side);
        if (w % side === 0 && h % side === 0) expect(claim.kind).toBe(side === g ? "best" : "smaller");
        else expect(claim.kind).toBe("cuts");
      }
    }
  });
  it("generates rectangles with the requested share of gcd = 1", () => {
    const rng = mulberry32(41);
    let coprime = 0;
    for (let i = 0; i < 2000; i++) {
      const c = generateMcd(mcdDefaults, rng);
      expect(c.width).not.toBe(c.height);
      expect(Math.min(c.width, c.height)).toBeGreaterThanOrEqual(6);
      expect(Math.max(c.width, c.height)).toBeLessThanOrEqual(24);
      if (gcd(c.width, c.height) === 1) coprime++;
    }
    expect(coprime / 2000).toBeGreaterThan(0.1);
    expect(coprime / 2000).toBeLessThan(0.2);
    expect(gcd(generateMcd({ ...mcdDefaults, coprimePct: 0 }, rng).width, 1)).toBe(1);
    for (let i = 0; i < 100; i++) {
      const c = generateMcd({ ...mcdDefaults, coprimePct: 0 }, rng);
      expect(gcd(c.width, c.height)).toBeGreaterThan(1);
    }
  });
  it("validates its config and writes helpful texts", () => {
    expect(mcdSchema.safeParse(mcdDefaults).success).toBe(true);
    expect(mcdSchema.safeParse({ ...mcdDefaults, minSide: 30, maxSide: 10 }).success).toBe(false);
    expect(mcdSchema.safeParse({ ...mcdDefaults, minSide: 5, maxSide: 6, coprimePct: 10 }).success).toBe(false);
    expect(mcdSchema.safeParse({ ...mcdDefaults, minSide: 5, maxSide: 6, coprimePct: 100 }).success).toBe(true);
    expect(mcdSuccess(12, 18)).toContain("mcd(12, 18) = 6");
    expect(mcdSuccess(12, 18)).toContain("1, 2, 3, 6");
    expect(cutsMessage(5, 12, 18, [12, 18])).toContain("12 ni 18");
    expect(mcdHint(2, 12, 18)).toContain("1, 2, 3, 4, 6, 12");
    expect(mcdHint(3, 12, 18)).toContain("lado 6");
  });
});

describe("mcm", () => {
  it("computes lcm, flashes and multiples", () => {
    expect(lcm(4, 6)).toBe(12);
    expect(lcm(3, 7)).toBe(21);
    expect(isLit(0, 4)).toBe(false);
    expect(isLit(8, 4)).toBe(true);
    expect(multiples(4, 20)).toEqual([4, 8, 12, 16, 20]);
  });
  it("judges every second of the timeline", () => {
    for (const [a, b] of [[4, 6], [3, 7], [5, 10], [6, 9]]) {
      const first = lcm(a, b);
      for (let t = 0; t <= 130; t++) {
        const claim = judgeClaim(a, b, t);
        if (t > 0 && t % a === 0 && t % b === 0) expect(claim.kind).toBe(t === first ? "first" : "later");
        else expect(claim.kind).toBe("missing");
        if (claim.kind === "later") expect(claim.first).toBe(first);
      }
    }
    expect(judgeClaim(4, 6, 0)).toEqual({ kind: "missing", which: "both" });
    expect(judgeClaim(4, 6, 8)).toEqual({ kind: "missing", which: "b" });
    expect(judgeClaim(4, 6, 6)).toEqual({ kind: "missing", which: "a" });
  });
  it("generates pairs inside the limits, in both orders, without repeating", () => {
    const rng = mulberry32(51);
    let key: string | undefined;
    let swapped = 0;
    for (let i = 0; i < 400; i++) {
      const c = generateMcm(mcmDefaults, rng, key);
      expect(c.a).not.toBe(c.b);
      expect(Math.min(c.a, c.b)).toBeGreaterThanOrEqual(2);
      expect(Math.max(c.a, c.b)).toBeLessThanOrEqual(10);
      expect(lcm(c.a, c.b)).toBeLessThanOrEqual(60);
      expect(c.key).not.toBe(key);
      key = c.key;
      if (c.a > c.b) swapped++;
    }
    expect(swapped).toBeGreaterThan(100);
    expect(swapped).toBeLessThan(300);
  });
  it("validates its config and writes helpful texts", () => {
    expect(mcmSchema.safeParse(mcmDefaults).success).toBe(true);
    expect(mcmSchema.safeParse({ ...mcmDefaults, minPeriod: 8, maxPeriod: 5 }).success).toBe(false);
    expect(mcmSchema.safeParse({ ...mcmDefaults, minPeriod: 7, maxPeriod: 9, maxLcm: 12 }).success).toBe(false);
    expect(mcmSuccess(4, 6)).toContain("mcm(4, 6) = 12");
    expect(missingMessage(4, 6, 8, "b")).toContain("luz B");
    expect(missingMessage(4, 6, 0, "both")).toContain("segundo 0");
    expect(mcmHint(2, 4, 6)).toContain("4, 8, 12");
    expect(mcmHint(3, 4, 6)).toContain("segundo 12");
  });
});

describe("registry", () => {
  it("registers every game once, with unique slugs and a valid default config", () => {
    expect(games.map((g) => g.slug)).toEqual(["naranjas", "caza-divisores", "criba", "criterios", "arbol", "mcd", "mcm"]);
    expect(new Set(games.map((g) => g.slug)).size).toBe(games.length);
    for (const game of games) {
      expect(game.configSchema.safeParse(game.defaults).success, game.slug).toBe(true);
      expect(getGame(game.slug)).toBe(game);
    }
  });
  it("has an admin field for every setting and no field without a setting", () => {
    for (const game of games) {
      const settings = Object.keys(game.defaults as object).sort();
      const fields = game.adminFields.map((f) => f.key).sort();
      expect(fields, game.slug).toEqual(settings);
    }
  });
  it("produces the requested number of preview examples", () => {
    for (const game of games) {
      const examples = (game.previewExamples as (c: unknown, n: number) => string[])(game.defaults, 5);
      expect(examples, game.slug).toHaveLength(5);
      for (const example of examples) expect(example.length).toBeGreaterThan(5);
    }
  });
  it("rejects a numeric field value outside its declared range", () => {
    for (const game of games) {
      for (const field of game.adminFields) {
        if (field.type !== "number") continue;
        const bad = { ...(game.defaults as object), [field.key]: field.max + 1 };
        expect(game.configSchema.safeParse(bad).success, `${game.slug}.${field.key}`).toBe(false);
        const low = { ...(game.defaults as object), [field.key]: field.min - 1 };
        expect(game.configSchema.safeParse(low).success, `${game.slug}.${field.key} min`).toBe(false);
      }
    }
  });
  it("keeps divisors helper consistent for the games that rely on it", () => {
    expect(divisors(12)).toEqual([1, 2, 3, 4, 6, 12]);
  });
});
