export const PILE = -1;

export type Placement = number[];
export type VerdictStatus = "pending" | "unequal" | "more" | "correct";
export type Verdict = { status: VerdictStatus; perBasket: number[]; surplus: number; pile: number };

export const emptyPlacement = (oranges: number): Placement => Array<number>(oranges).fill(PILE);
export const surplusZone = (baskets: number) => baskets;

export function solution(oranges: number, baskets: number) {
  return { each: Math.floor(oranges / baskets), surplus: oranges % baskets, exact: oranges % baskets === 0 };
}

export function moveOranges(placement: Placement, ids: Iterable<number>, zone: number): Placement {
  const next = [...placement];
  for (const id of ids) next[id] = zone;
  return next;
}

export function evaluate(placement: Placement, baskets: number): Verdict {
  const perBasket = Array<number>(baskets).fill(0);
  let surplus = 0;
  let pile = 0;
  for (const zone of placement) {
    if (zone === PILE) pile++;
    else if (zone === baskets) surplus++;
    else perBasket[zone]++;
  }
  const base = { perBasket, surplus, pile };
  if (pile > 0) return { ...base, status: "pending" };
  if (perBasket.some((count) => count !== perBasket[0])) return { ...base, status: "unequal" };
  if (surplus >= baskets) return { ...base, status: "more" };
  return { ...base, status: "correct" };
}
