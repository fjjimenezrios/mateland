export type Point = { x: number; y: number };
export type Marked = Point & { id: number };

export const MIN_LASSO_POINTS = 4;
export const MIN_LASSO_LENGTH = 40;

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function pathLength(path: readonly Point[]): number {
  let total = 0;
  for (let i = 1; i < path.length; i++) total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return total;
}

export function selectInside(items: readonly Marked[], path: readonly Point[]): number[] {
  if (path.length < MIN_LASSO_POINTS || pathLength(path) < MIN_LASSO_LENGTH) return [];
  return items.filter((item) => pointInPolygon(item, path)).map((item) => item.id);
}
