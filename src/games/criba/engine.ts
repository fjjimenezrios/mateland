export type SieveState = { limit: number; picked: number[]; crossedBy: Record<number, number> };

export type TapResult =
  | { kind: "ok"; state: SieveState; crossed: number[] }
  | { kind: "one" }
  | { kind: "crossed"; by: number }
  | { kind: "already" }
  | { kind: "early"; pending: number }
  | { kind: "finished" };

export const createSieve = (limit: number): SieveState => ({ limit, picked: [], crossedBy: {} });

export function pendingPrime(state: SieveState): number | null {
  for (let n = 2; n <= state.limit; n++) {
    if (state.crossedBy[n] === undefined && !state.picked.includes(n)) return n * n <= state.limit ? n : null;
  }
  return null;
}

export const isFinished = (state: SieveState) => pendingPrime(state) === null;

export function remainingPrimes(state: SieveState): number[] {
  return Array.from({ length: state.limit - 1 }, (_, i) => i + 2).filter((n) => state.crossedBy[n] === undefined);
}

export function tapNumber(state: SieveState, n: number): TapResult {
  if (n === 1) return { kind: "one" };
  const by = state.crossedBy[n];
  if (by !== undefined) return { kind: "crossed", by };
  if (state.picked.includes(n)) return { kind: "already" };
  const pending = pendingPrime(state);
  if (pending === null) return { kind: "finished" };
  if (n !== pending) return { kind: "early", pending };

  const crossed: number[] = [];
  const crossedBy = { ...state.crossedBy };
  for (let multiple = n * 2; multiple <= state.limit; multiple += n) {
    if (crossedBy[multiple] === undefined) {
      crossedBy[multiple] = n;
      crossed.push(multiple);
    }
  }
  return { kind: "ok", crossed, state: { ...state, picked: [...state.picked, n], crossedBy } };
}
