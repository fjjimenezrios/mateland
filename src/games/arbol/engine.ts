import { divisors, isPrime } from "@/lib/math";

export type TreeNode = { id: number; value: number; children: [number, number] | null; prime: boolean };
export type Tree = TreeNode[];

export const createTree = (value: number): Tree => [{ id: 0, value, children: null, prime: false }];

export const leaves = (tree: Tree) => tree.filter((node) => node.children === null);
export const isComplete = (tree: Tree) => leaves(tree).every((node) => node.prime);

export function factorPairs(n: number): [number, number][] {
  return divisors(n)
    .filter((d) => d >= 2 && d * d <= n && d !== n)
    .map((d) => [d, n / d] as [number, number]);
}

export function primeFactors(n: number): number[] {
  const result: number[] = [];
  let rest = n;
  for (let d = 2; d * d <= rest; d++) {
    while (rest % d === 0) {
      result.push(d);
      rest /= d;
    }
  }
  if (rest > 1) result.push(rest);
  return result;
}

const SUPERSCRIPTS = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const superscript = (n: number) => String(n).split("").map((digit) => SUPERSCRIPTS[Number(digit)]).join("");

export function factorizationText(n: number): string {
  const counts = new Map<number, number>();
  for (const factor of primeFactors(n)) counts.set(factor, (counts.get(factor) ?? 0) + 1);
  return [...counts].map(([prime, power]) => (power > 1 ? `${prime}${superscript(power)}` : String(prime))).join(" × ");
}

export type SplitResult = { ok: true; tree: Tree } | { ok: false; reason: "prime" | "invalid" | "done" };

export function splitNode(tree: Tree, id: number, factor: number): SplitResult {
  const node = tree.find((item) => item.id === id);
  if (!node || node.children !== null || node.prime) return { ok: false, reason: "done" };
  if (isPrime(node.value)) return { ok: false, reason: "prime" };
  if (factor < 2 || factor >= node.value || node.value % factor !== 0) return { ok: false, reason: "invalid" };
  const [small, big] = [factor, node.value / factor].sort((a, b) => a - b);
  const first = tree.length;
  const next = tree.map((item) => (item.id === id ? { ...item, children: [first, first + 1] as [number, number] } : item));
  return {
    ok: true,
    tree: [...next, { id: first, value: small, children: null, prime: false }, { id: first + 1, value: big, children: null, prime: false }],
  };
}

export type PrimeResult = { ok: true; tree: Tree } | { ok: false; reason: "composite"; pair: [number, number] } | { ok: false; reason: "done" };

export function declarePrime(tree: Tree, id: number): PrimeResult {
  const node = tree.find((item) => item.id === id);
  if (!node || node.children !== null || node.prime) return { ok: false, reason: "done" };
  if (!isPrime(node.value)) return { ok: false, reason: "composite", pair: factorPairs(node.value)[0] };
  return { ok: true, tree: tree.map((item) => (item.id === id ? { ...item, prime: true } : item)) };
}

export type Layout = { positions: Record<number, { x: number; y: number }>; width: number; height: number };

export function layoutTree(tree: Tree, unit = 86, levelHeight = 96, radius = 32): Layout {
  const positions: Record<number, { x: number; y: number }> = {};
  let nextLeaf = 0;
  let maxDepth = 0;
  const place = (id: number, depth: number): number => {
    const node = tree[id];
    maxDepth = Math.max(maxDepth, depth);
    let x: number;
    if (node.children === null) {
      x = (nextLeaf + 0.5) * unit;
      nextLeaf += 1;
    } else {
      const xs = node.children.map((child) => place(child, depth + 1));
      x = (xs[0] + xs[1]) / 2;
    }
    positions[id] = { x, y: radius + 8 + depth * levelHeight };
    return x;
  };
  place(0, 0);
  return { positions, width: nextLeaf * unit, height: radius * 2 + 28 + maxDepth * levelHeight };
}
