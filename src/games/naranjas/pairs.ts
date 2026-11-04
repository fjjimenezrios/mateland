import { isPrime } from "@/lib/math";

export type Category = "prime" | "exact" | "inexact";
export type Pair = { oranges: number; baskets: number };
export type Ranges = { minOranges: number; maxOranges: number; minBaskets: number; maxBaskets: number };

export function candidatePairs(ranges: Ranges): Record<Category, Pair[]> {
  const pools: Record<Category, Pair[]> = { prime: [], exact: [], inexact: [] };
  for (let oranges = ranges.minOranges; oranges <= ranges.maxOranges; oranges++) {
    for (let baskets = ranges.minBaskets; baskets <= ranges.maxBaskets; baskets++) {
      if (baskets >= oranges) continue;
      const category: Category = isPrime(oranges) ? "prime" : oranges % baskets === 0 ? "exact" : "inexact";
      pools[category].push({ oranges, baskets });
    }
  }
  return pools;
}
