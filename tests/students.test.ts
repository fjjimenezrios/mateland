import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { emptyTotals, mergeProgress, progressDeltaSchema, isEmptyProgress } from "@/lib/progress-shared";
import { readBlob, readConfig, updateBlob, writeConfig } from "@/lib/store";
import {
  addProgress, authenticate, createClass, deleteClass, isStudentActive, normalizeUsername,
  publicDirectory, readDirectory, readProgress, resetPassword, setActive,
} from "@/lib/students";

let dir: string;

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "mates-test-"));
  process.env.STORE_BACKEND = "local";
  process.env.DATA_DIR = dir;
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("normalizeUsername", () => {
  it("lowercases, strips accents and joins words", () => {
    expect(normalizeUsername("  Lucía M ")).toBe("lucia-m");
    expect(normalizeUsername("PABLO.R")).toBe("pablo.r");
  });
  it("rejects unusable names", () => {
    expect(normalizeUsername("a")).toBeNull();
    expect(normalizeUsername("x".repeat(25))).toBeNull();
    expect(normalizeUsername("juan/../etc")).toBeNull();
    expect(normalizeUsername("")).toBeNull();
    expect(normalizeUsername("ana<script>")).toBeNull();
  });
});

describe("store", () => {
  it("does not lose concurrent updates", async () => {
    await Promise.all(Array.from({ length: 12 }, (_, i) => updateBlob<number[]>("race.json", [], (current) => [...current, i])));
    const doc = await readBlob<number[]>("race.json");
    expect(doc?.value.slice().sort((a, b) => a - b)).toEqual(Array.from({ length: 12 }, (_, i) => i));
  });
  it("refuses paths outside the blob directory", async () => {
    await expect(readBlob("../config.json")).rejects.toThrow();
  });
  it("round-trips config items and returns only the requested keys", async () => {
    await writeConfig("a", { x: 1 });
    await writeConfig("b", 2);
    expect(await readConfig(["a"])).toEqual({ a: { x: 1 } });
    expect(await readConfig(["a", "b", "missing"])).toEqual({ a: { x: 1 }, b: 2 });
  });
});

describe("students", () => {
  it("creates a class, deduplicates usernames and authenticates", async () => {
    const { credentials, rejected } = await createClass("1.º A", ["Lucía M", "pablo-r", "lucia m", "", "x", "ana"]);
    expect(credentials.map((c) => c.username)).toEqual(["lucia-m", "pablo-r", "lucia-m2", "ana"]);
    expect(rejected).toEqual(["x"]);
    for (const credential of credentials) expect(credential.password).toMatch(/^[a-z]+-[a-z]+-[a-z]+-\d{2}$/);

    const lucia = credentials[0];
    expect((await authenticate("LUCIA-M", lucia.password))?.username).toBe("lucia-m");
    expect(await authenticate("lucia-m", "otra-clave-mala-99")).toBeNull();
    expect(await authenticate("nadie", lucia.password)).toBeNull();
    expect(await authenticate("lucia-m2", lucia.password)).toBeNull();
  });

  it("never exposes password hashes through the public directory", async () => {
    const directory = publicDirectory(await readDirectory());
    expect(JSON.stringify(directory)).not.toContain("passwordHash");
    expect(directory.students.length).toBeGreaterThan(0);
  });

  it("avoids username collisions across classes", async () => {
    const { credentials } = await createClass("1.º B", ["ana", "ana"]);
    expect(credentials.map((c) => c.username)).toEqual(["ana2", "ana3"]);
  });

  it("resets passwords and deactivates students", async () => {
    const { credentials } = await createClass("1.º C", ["marta"]);
    const marta = (await readDirectory()).students.find((s) => s.username === "marta")!;
    const fresh = await resetPassword(marta.id);
    expect(fresh?.username).toBe("marta");
    expect(await authenticate("marta", credentials[0].password)).toBeNull();
    expect((await authenticate("marta", fresh!.password))?.id).toBe(marta.id);

    await setActive(marta.id, false);
    expect(await authenticate("marta", fresh!.password)).toBeNull();
    expect(await isStudentActive(marta.id)).toBe(false);
    await setActive(marta.id, true);
    expect(await isStudentActive(marta.id)).toBe(true);
    expect(await resetPassword("missing")).toBeNull();
    expect(await setActive("missing", true)).toBe(false);
  });

  it("accumulates progress and deletes it with the class", async () => {
    const { schoolClass } = await createClass("1.º D", ["leo"]);
    const leo = (await readDirectory()).students.find((s) => s.username === "leo")!;
    await addProgress(leo.id, { naranjas: { completed: 2, solved: 1, hintsUsed: 3, bestStreak: 1 } });
    await addProgress(leo.id, { naranjas: { completed: 1, solved: 1, hintsUsed: 0, bestStreak: 4 }, "caza-divisores": { completed: 1, solved: 0, hintsUsed: 1, bestStreak: 0 } });
    expect(await readProgress(leo.id)).toEqual({
      naranjas: { completed: 3, solved: 2, hintsUsed: 3, bestStreak: 4 },
      "caza-divisores": { completed: 1, solved: 0, hintsUsed: 1, bestStreak: 0 },
    });
    expect(existsSync(path.join(dir, "blob", "progress", `${leo.id}.json`))).toBe(true);
    expect(await deleteClass(schoolClass.id)).toBe(true);
    expect(existsSync(path.join(dir, "blob", "progress", `${leo.id}.json`))).toBe(false);
    expect((await readDirectory()).students.some((s) => s.username === "leo")).toBe(false);
    expect(await deleteClass(schoolClass.id)).toBe(false);
  });
});

describe("progress merge and validation", () => {
  it("adds counters and keeps the best streak", () => {
    const merged = mergeProgress(
      { naranjas: { completed: 1, solved: 1, hintsUsed: 0, bestStreak: 5 } },
      { naranjas: { completed: 2, solved: 1, hintsUsed: 2, bestStreak: 2 }, "caza-divisores": { completed: 1, solved: 1, hintsUsed: 0, bestStreak: 1 } },
    );
    expect(merged.naranjas).toEqual({ completed: 3, solved: 2, hintsUsed: 2, bestStreak: 5 });
    expect(merged["caza-divisores"].completed).toBe(1);
  });
  it("rejects unknown games, negatives, huge values and incoherent data", () => {
    const ok = { completed: 1, solved: 1, hintsUsed: 0, bestStreak: 1 };
    expect(progressDeltaSchema.safeParse({ naranjas: ok }).success).toBe(true);
    expect(progressDeltaSchema.safeParse({ inventado: ok }).success).toBe(false);
    expect(progressDeltaSchema.safeParse({ naranjas: { ...ok, completed: -1 } }).success).toBe(false);
    expect(progressDeltaSchema.safeParse({ naranjas: { ...ok, completed: 100000 } }).success).toBe(false);
    expect(progressDeltaSchema.safeParse({ naranjas: { ...ok, solved: 5 } }).success).toBe(false);
    expect(progressDeltaSchema.safeParse({ naranjas: { ...ok, completed: 1.5 } }).success).toBe(false);
  });
  it("detects empty progress", () => {
    expect(isEmptyProgress({})).toBe(true);
    expect(isEmptyProgress({ naranjas: emptyTotals() })).toBe(true);
    expect(isEmptyProgress({ naranjas: { ...emptyTotals(), completed: 1 } })).toBe(false);
  });
});
