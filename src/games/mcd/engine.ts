export const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

export type Coverage = { cols: number; rows: number; tiles: number; leftoverX: number; leftoverY: number; exact: boolean };

export function coverage(width: number, height: number, side: number): Coverage {
  const cols = Math.floor(width / side);
  const rows = Math.floor(height / side);
  const leftoverX = width - cols * side;
  const leftoverY = height - rows * side;
  return { cols, rows, tiles: cols * rows, leftoverX, leftoverY, exact: leftoverX === 0 && leftoverY === 0 };
}

export type Claim = { kind: "best" } | { kind: "smaller"; fits: true } | { kind: "cuts"; cuts: number[] };

export function judge(width: number, height: number, side: number): Claim {
  const cuts = [width, height].filter((measure) => measure % side !== 0);
  if (cuts.length > 0) return { kind: "cuts", cuts };
  return side === gcd(width, height) ? { kind: "best" } : { kind: "smaller", fits: true };
}
