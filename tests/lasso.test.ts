import { describe, expect, it } from "vitest";
import { pathLength, pointInPolygon, selectInside, type Marked, type Point } from "@/games/_kit/lasso";

const circle = (cx: number, cy: number, r: number, steps = 24): Point[] =>
  Array.from({ length: steps }, (_, i) => ({
    x: cx + r * Math.cos((2 * Math.PI * i) / steps),
    y: cy + r * Math.sin((2 * Math.PI * i) / steps),
  }));

describe("pointInPolygon", () => {
  const square: Point[] = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
  it("detects inside and outside", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(pointInPolygon({ x: 11, y: 5 }, square)).toBe(false);
    expect(pointInPolygon({ x: -1, y: -1 }, square)).toBe(false);
  });
  it("handles concave shapes", () => {
    const u: Point[] = [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 9 }, { x: 6, y: 9 }, { x: 6, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 9 }, { x: 0, y: 9 }];
    expect(pointInPolygon({ x: 4.5, y: 5 }, u)).toBe(false);
    expect(pointInPolygon({ x: 1.5, y: 5 }, u)).toBe(true);
    expect(pointInPolygon({ x: 7.5, y: 5 }, u)).toBe(true);
  });
});

describe("selectInside", () => {
  const items: Marked[] = [
    { id: 0, x: 100, y: 100 },
    { id: 1, x: 130, y: 110 },
    { id: 2, x: 110, y: 140 },
    { id: 3, x: 300, y: 100 },
    { id: 4, x: 190, y: 100 },
  ];
  it("selects exactly the items whose center is inside the loop", () => {
    expect(selectInside(items, circle(120, 120, 50))).toEqual([0, 1, 2]);
  });
  it("selects nothing when the loop is empty or tiny", () => {
    expect(selectInside(items, circle(500, 500, 40))).toEqual([]);
    expect(selectInside(items, circle(100, 100, 3))).toEqual([]);
    expect(selectInside(items, [{ x: 100, y: 100 }, { x: 101, y: 100 }])).toEqual([]);
  });
  it("works for an irregular, not-quite-closed hand drawn loop", () => {
    const path = circle(120, 120, 60, 40).map((p, i) => ({ x: p.x + Math.sin(i) * 6, y: p.y + Math.cos(i * 2) * 6 }));
    expect(selectInside(items, path.slice(0, -1))).toEqual([0, 1, 2]);
  });
  it("measures path length", () => {
    expect(pathLength([{ x: 0, y: 0 }, { x: 3, y: 4 }])).toBe(5);
  });
});
