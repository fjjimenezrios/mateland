import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { writeFile, mkdir } from "node:fs/promises";
import { addProgress, createClass, readAllProgress, readDirectory, readProgress, readProgressDoc } from "@/lib/students";
import {
  bandOf, buildRows, histogram, lastSeenText, metricValue, normalPdf, summarize, toCsv, totalsOf, zScore, type StudentRecord,
} from "@/lib/stats";

const student = (username: string, totals: StudentRecord["totals"], updatedAt = 0): StudentRecord => ({ id: username, classId: "c1", username, active: true, totals, updatedAt });
const t = (completed: number, solved: number, hintsUsed = 0, bestStreak = 0) => ({ completed, solved, hintsUsed, bestStreak });

describe("per-student stats", () => {
  it("adds the selected games and keeps the best streak", () => {
    const totals = { naranjas: t(5, 3, 4, 2), criba: t(3, 3, 0, 3), mcd: t(9, 1, 7, 1) };
    expect(totalsOf(totals, ["naranjas", "criba"])).toEqual({ completed: 8, solved: 6, hints: 4, streak: 3 });
    expect(totalsOf(totals, ["mcd"])).toEqual({ completed: 9, solved: 1, hints: 7, streak: 1 });
    expect(totalsOf(totals, ["arbol"])).toEqual({ completed: 0, solved: 0, hints: 0, streak: 0 });
  });
  it("computes each metric and returns null without activity", () => {
    const stats = { completed: 8, solved: 6, hints: 4, streak: 3 };
    expect(metricValue(stats, "completed")).toBe(8);
    expect(metricValue(stats, "autonomy")).toBe(75);
    expect(metricValue(stats, "streak")).toBe(3);
    expect(metricValue({ completed: 0, solved: 0, hints: 0, streak: 0 }, "autonomy")).toBeNull();
  });
});

describe("class statistics", () => {
  it("summarises a sample with the sample standard deviation", () => {
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9])!;
    expect(s.n).toBe(8);
    expect(s.mean).toBe(5);
    expect(s.median).toBe(4.5);
    expect(s.sd).toBeCloseTo(2.138, 3);
    expect([s.min, s.max]).toEqual([2, 9]);
    expect(summarize([])).toBeNull();
    expect(summarize([7])).toMatchObject({ n: 1, mean: 7, sd: 0, median: 7 });
  });
  it("classifies students by their distance to the mean", () => {
    const s = summarize([10, 20, 30, 40, 50])!;
    expect(zScore(30, s)).toBe(0);
    expect(zScore(50, s)).toBeGreaterThan(1);
    expect(bandOf(zScore(10, s))).toBe("support");
    expect(bandOf(zScore(50, s))).toBe("high");
    expect(bandOf(zScore(30, s))).toBe("typical");
    expect(bandOf(null)).toBe("none");
    expect(zScore(5, { n: 3, mean: 5, sd: 0, median: 5, min: 5, max: 5 })).toBe(0);
  });
  it("builds rows ignoring students without activity in the distribution", () => {
    const students = [student("a", { naranjas: t(10, 9) }), student("b", { naranjas: t(2, 0) }), student("c", {}), student("d", { naranjas: t(6, 3) })];
    const { rows, summary } = buildRows(students, ["naranjas"], "completed");
    expect(summary).toMatchObject({ n: 3, mean: 6 });
    expect(rows.map((r) => r.band)).toEqual(["high", "support", "none", "typical"]);
    expect(rows[2].value).toBeNull();
    expect(buildRows([student("x", {})], ["naranjas"], "completed").summary).toBeNull();
  });
});

describe("histogram and normal curve", () => {
  it("bins counts with a continuity correction so each integer sits inside its bar", () => {
    const points = [0, 1, 1, 2, 2, 2, 3, 9].map((value, index) => ({ name: `s${index}`, value }));
    const h = histogram(points, "completed");
    expect(h.step).toBe(2);
    expect(h.bins.map((b) => b.count)).toEqual([3, 4, 0, 0, 1]);
    expect(h.bins[0]).toMatchObject({ from: -0.5, to: 1.5, label: "0–1" });
    expect(h.bins.reduce((sum, b) => sum + b.count, 0)).toBe(points.length);
    expect(h.bins[4].names).toEqual(["s7"]);
  });
  it("uses ten-point bins for percentages and includes 100 in the last one", () => {
    const h = histogram([0, 9, 10, 55, 99, 100].map((value, i) => ({ name: `s${i}`, value })), "autonomy");
    expect(h.bins).toHaveLength(10);
    expect(h.bins.map((b) => b.count)).toEqual([2, 1, 0, 0, 0, 1, 0, 0, 0, 2]);
    expect(h.bins[9].label).toBe("90–100%");
    expect(h.bins[0].label).toBe("0–9%");
  });
  it("handles a single value and an empty class", () => {
    expect(histogram([{ name: "a", value: 0 }], "completed").bins.map((b) => b.count)).toEqual([1]);
    expect(histogram([], "streak").bins.every((b) => b.count === 0)).toBe(true);
  });
  it("evaluates the normal density", () => {
    expect(normalPdf(0, 0, 1)).toBeCloseTo(0.39894, 5);
    expect(normalPdf(1, 0, 1)).toBeCloseTo(0.24197, 5);
    expect(normalPdf(5, 5, 2)).toBeGreaterThan(normalPdf(7, 5, 2));
    let area = 0;
    for (let x = -6; x < 6; x += 0.01) area += normalPdf(x, 0, 1) * 0.01;
    expect(area).toBeCloseTo(1, 3);
  });
});

describe("last connection and csv", () => {
  const now = Date.UTC(2026, 10, 4, 12);
  it("describes how long ago a student synced", () => {
    expect(lastSeenText(0, now)).toBe("Nunca");
    expect(lastSeenText(now - 5 * 60000, now)).toBe("Hace unos minutos");
    expect(lastSeenText(now - 3 * 3600000, now)).toBe("Hace 3 h");
    expect(lastSeenText(now - 30 * 3600000, now)).toBe("Ayer");
    expect(lastSeenText(now - 5 * 86400000, now)).toBe("Hace 5 días");
  });
  it("exports an Excel-friendly csv and escapes dangerous cells", () => {
    const rows = buildRows([student("lucia-m", { naranjas: t(4, 3, 2, 2) }, now - 60000), student('x";y', {})], ["naranjas"], "completed").rows;
    const csv = toCsv(rows, () => "1.º A", now);
    const lines = csv.replace("﻿", "").split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines[0]).toBe("Alumno;Clase;Retos completados;Sin pistas;Autonomía (%);Pistas usadas;Mejor racha;Última conexión");
    expect(lines[1]).toBe("lucia-m;1.º A;4;3;75;2;2;Hace unos minutos");
    expect(lines[2].startsWith('"x"";y";')).toBe(true);
  });
});

describe("progress documents", () => {
  let dir: string;
  beforeAll(async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "mates-stats-"));
    process.env.STORE_BACKEND = "local";
    process.env.DATA_DIR = dir;
  });
  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("stores the last update time and still reads legacy files", async () => {
    const { credentials } = await createClass("1.º Z", ["uno", "dos", "tres"]);
    const directory = await readDirectory();
    const [uno, dos] = ["uno", "dos"].map((name) => directory.students.find((s) => s.username === name)!);
    expect(credentials).toHaveLength(3);

    await addProgress(uno.id, { naranjas: t(2, 1, 1, 1) }, 1_700_000_000_000);
    await addProgress(uno.id, { naranjas: t(1, 1, 0, 2) }, 1_700_000_500_000);
    expect(await readProgressDoc(uno.id)).toEqual({ totals: { naranjas: t(3, 2, 1, 2) }, updatedAt: 1_700_000_500_000 });
    expect(await readProgress(uno.id)).toEqual({ naranjas: t(3, 2, 1, 2) });

    await mkdir(path.join(dir, "blob", "progress"), { recursive: true });
    await writeFile(path.join(dir, "blob", "progress", `${dos.id}.json`), JSON.stringify({ naranjas: t(4, 4, 0, 4) }));
    expect(await readProgressDoc(dos.id)).toEqual({ totals: { naranjas: t(4, 4, 0, 4) }, updatedAt: 0 });
    await addProgress(dos.id, { naranjas: t(1, 1, 0, 5) }, 42);
    expect(await readProgressDoc(dos.id)).toEqual({ totals: { naranjas: t(5, 5, 0, 5) }, updatedAt: 42 });
  });

  it("reads every student of the class, including those without progress", async () => {
    const all = await readAllProgress(await readDirectory());
    expect(all).toHaveLength(3);
    const tres = all.find((s) => s.username === "tres")!;
    expect(tres).toMatchObject({ totals: {}, updatedAt: 0, active: true });
    expect(JSON.stringify(all)).not.toContain("passwordHash");
  });

  it("reads thirty students in batches", async () => {
    await createClass("1.º Y", Array.from({ length: 30 }, (_, i) => `alumno${i + 1}`));
    const all = await readAllProgress(await readDirectory());
    expect(all).toHaveLength(33);
    expect(new Set(all.map((s) => s.id)).size).toBe(33);
  });
});
