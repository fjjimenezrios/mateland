import { randomUUID } from "node:crypto";
import { generateStudentPassword, hashPassword, verifyPassword } from "./password";
import { deleteBlob, readBlob, updateBlob } from "./store";
import { mergeProgress, type ProgressMap } from "./progress-shared";

export type Student = { id: string; classId: string; username: string; passwordHash: string; active: boolean };
export type SchoolClass = { id: string; name: string };
export type Directory = { classes: SchoolClass[]; students: Student[] };
export type Credential = { username: string; password: string };

const INDEX = "students.json";
const EMPTY: Directory = { classes: [], students: [] };
const progressPath = (studentId: string) => `progress/${studentId}.json`;
const DUMMY_HASH = "00000000000000000000000000000000:" + "0".repeat(64);

export function normalizeUsername(raw: string): string | null {
  const cleaned = raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
  return /^[a-z0-9._-]{2,24}$/.test(cleaned) ? cleaned : null;
}

export async function readDirectory(options: { fresh?: boolean } = {}): Promise<Directory> {
  return (await readBlob<Directory>(INDEX, options))?.value ?? structuredClone(EMPTY);
}

export function publicDirectory(directory: Directory) {
  return {
    classes: directory.classes,
    students: directory.students.map(({ passwordHash: _hash, ...student }) => student),
  };
}

export async function authenticate(username: string, password: string): Promise<Student | null> {
  const normalized = normalizeUsername(username);
  const directory = await readDirectory();
  const student = normalized ? directory.students.find((s) => s.username === normalized) : undefined;
  const valid = await verifyPassword(password, student?.passwordHash ?? DUMMY_HASH);
  return student && student.active && valid ? student : null;
}

export async function isStudentActive(studentId: string): Promise<boolean> {
  const directory = await readDirectory();
  return directory.students.some((s) => s.id === studentId && s.active);
}

function uniqueUsername(base: string, taken: Set<string>): string {
  const trimmed = base.slice(0, 22);
  let candidate = trimmed;
  for (let suffix = 2; taken.has(candidate); suffix++) candidate = `${trimmed}${suffix}`;
  taken.add(candidate);
  return candidate;
}

export async function createClass(name: string, rawNames: string[]) {
  const accepted: string[] = [];
  const rejected: string[] = [];
  for (const raw of rawNames) {
    const username = normalizeUsername(raw);
    if (username) accepted.push(username);
    else if (raw.trim()) rejected.push(raw.trim());
  }
  const prepared = await Promise.all(
    accepted.map(async (username) => {
      const password = generateStudentPassword();
      return { username, password, passwordHash: await hashPassword(password) };
    }),
  );

  const schoolClass: SchoolClass = { id: randomUUID(), name };
  let credentials: Credential[] = [];
  await updateBlob<Directory>(INDEX, EMPTY, (directory) => {
    const taken = new Set(directory.students.map((s) => s.username));
    const created = prepared.map((item) => ({
      student: {
        id: randomUUID(),
        classId: schoolClass.id,
        username: uniqueUsername(item.username, taken),
        passwordHash: item.passwordHash,
        active: true,
      },
      password: item.password,
    }));
    credentials = created.map(({ student, password }) => ({ username: student.username, password }));
    return {
      classes: [...directory.classes, schoolClass],
      students: [...directory.students, ...created.map(({ student }) => student)],
    };
  });
  return { schoolClass, credentials, rejected };
}

export async function resetPassword(studentId: string): Promise<Credential | null> {
  const password = generateStudentPassword();
  const passwordHash = await hashPassword(password);
  let username: string | null = null;
  await updateBlob<Directory>(INDEX, EMPTY, (directory) => {
    username = null;
    return {
      ...directory,
      students: directory.students.map((s) => {
        if (s.id !== studentId) return s;
        username = s.username;
        return { ...s, passwordHash, active: true };
      }),
    };
  });
  return username ? { username, password } : null;
}

export async function setActive(studentId: string, active: boolean): Promise<boolean> {
  let found = false;
  await updateBlob<Directory>(INDEX, EMPTY, (directory) => {
    found = directory.students.some((s) => s.id === studentId);
    return { ...directory, students: directory.students.map((s) => (s.id === studentId ? { ...s, active } : s)) };
  });
  return found;
}

export async function deleteClass(classId: string): Promise<boolean> {
  let removed: Student[] = [];
  let existed = false;
  await updateBlob<Directory>(INDEX, EMPTY, (directory) => {
    existed = directory.classes.some((c) => c.id === classId);
    removed = directory.students.filter((s) => s.classId === classId);
    return {
      classes: directory.classes.filter((c) => c.id !== classId),
      students: directory.students.filter((s) => s.classId !== classId),
    };
  });
  await Promise.all(removed.map((s) => deleteBlob(progressPath(s.id))));
  return existed;
}

export type ProgressDoc = { totals: ProgressMap; updatedAt: number };
export type StudentProgress = { id: string; classId: string; username: string; active: boolean; totals: ProgressMap; updatedAt: number };

function toDoc(raw: unknown): ProgressDoc {
  if (raw && typeof raw === "object" && "totals" in raw) return raw as ProgressDoc;
  return { totals: (raw as ProgressMap | null) ?? {}, updatedAt: 0 };
}

export async function readProgressDoc(studentId: string): Promise<ProgressDoc> {
  return toDoc((await readBlob<unknown>(progressPath(studentId), { fresh: true }))?.value);
}

export async function readProgress(studentId: string): Promise<ProgressMap> {
  return (await readProgressDoc(studentId)).totals;
}

export async function addProgress(studentId: string, delta: ProgressMap, now = Date.now()): Promise<ProgressMap> {
  const next = await updateBlob<unknown>(progressPath(studentId), {}, (current) => ({
    totals: mergeProgress(toDoc(current).totals, delta),
    updatedAt: now,
  }));
  return toDoc(next).totals;
}

const READ_BATCH = 10;

export async function readAllProgress(directory: Directory): Promise<StudentProgress[]> {
  const result: StudentProgress[] = [];
  for (let start = 0; start < directory.students.length; start += READ_BATCH) {
    const batch = directory.students.slice(start, start + READ_BATCH);
    const docs = await Promise.all(batch.map((student) => readProgressDoc(student.id)));
    batch.forEach((student, index) => {
      const { id, classId, username, active } = student;
      result.push({ id, classId, username, active, totals: docs[index].totals, updatedAt: docs[index].updatedAt });
    });
  }
  return result;
}
