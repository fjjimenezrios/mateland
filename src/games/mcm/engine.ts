const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

export const isLit = (time: number, period: number) => time > 0 && time % period === 0;

export const multiples = (period: number, upTo: number) => Array.from({ length: Math.floor(upTo / period) }, (_, i) => (i + 1) * period);

export type Claim =
  | { kind: "first" }
  | { kind: "later"; first: number }
  | { kind: "missing"; which: "a" | "b" | "both" };

export function judgeClaim(a: number, b: number, time: number): Claim {
  const litA = isLit(time, a);
  const litB = isLit(time, b);
  if (!litA || !litB) return { kind: "missing", which: !litA && !litB ? "both" : !litA ? "a" : "b" };
  const first = lcm(a, b);
  return time === first ? { kind: "first" } : { kind: "later", first };
}
