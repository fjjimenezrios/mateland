import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { BlobPreconditionFailedError, del, get, put } from "@vercel/blob";
import { getAll } from "@vercel/edge-config";

export class StoreUnavailableError extends Error {}
class ConflictError extends Error {}

type Backend = "vercel" | "local" | "none";

const dataDir = () => path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR ?? ".data");

function pickBackend(vercelReady: boolean): Backend {
  if (process.env.STORE_BACKEND === "local") return "local";
  if (vercelReady) return "vercel";
  return process.env.NODE_ENV === "production" ? "none" : "local";
}

const configBackend = () => pickBackend(Boolean(process.env.EDGE_CONFIG));
const blobBackend = () =>
  pickBackend(Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN));

async function atomicWrite(file: string, content: string) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, content);
  await rename(temp, file);
}

async function readLocal(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

function configRestUrl() {
  const connection = process.env.EDGE_CONFIG ?? "";
  const id = connection.match(/(ecfg_[A-Za-z0-9]+)/)?.[1];
  const token = process.env.VERCEL_API_TOKEN;
  if (!id || !token) throw new StoreUnavailableError("Faltan EDGE_CONFIG o VERCEL_API_TOKEN");
  const team = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
  return { url: `https://api.vercel.com/v1/edge-config/${id}/items${team}`, token };
}

export async function readConfig(keys: string[], options: { fresh?: boolean } = {}) {
  const backend = configBackend();
  if (backend === "none") return {} as Record<string, unknown>;
  if (backend === "local") {
    const raw = await readLocal(path.join(dataDir(), "config.json"));
    const all = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    return Object.fromEntries(keys.filter((key) => key in all).map((key) => [key, all[key]]));
  }
  if (options.fresh) {
    const { url, token } = configRestUrl();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!response.ok) throw new StoreUnavailableError(`Global Config respondió ${response.status}`);
    const items = (await response.json()) as { key: string; value: unknown }[];
    return Object.fromEntries(items.filter((item) => keys.includes(item.key)).map((item) => [item.key, item.value]));
  }
  return ((await getAll(keys)) ?? {}) as Record<string, unknown>;
}

export async function readConfigSafe(keys: string[]) {
  try {
    return await readConfig(keys);
  } catch {
    return {} as Record<string, unknown>;
  }
}

export async function writeConfig(key: string, value: unknown) {
  const backend = configBackend();
  if (backend === "none") throw new StoreUnavailableError("Global Config no está configurado");
  if (backend === "local") {
    const file = path.join(dataDir(), "config.json");
    const raw = await readLocal(file);
    const all = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    await atomicWrite(file, JSON.stringify({ ...all, [key]: value }, null, 2));
    return;
  }
  const { url, token } = configRestUrl();
  const response = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ operation: "upsert", key, value }] }),
  });
  if (!response.ok) throw new StoreUnavailableError(`Global Config respondió ${response.status}`);
}

export type BlobDoc<T> = { value: T; etag: string };

const localBlobFile = (pathname: string) => {
  const file = path.resolve(/* turbopackIgnore: true */ dataDir(), "blob", pathname);
  if (!file.startsWith(path.resolve(/* turbopackIgnore: true */ dataDir(), "blob") + path.sep)) throw new Error("Ruta no válida");
  return file;
};

const etagOf = (content: string) => createHash("sha1").update(content).digest("hex");

let localQueue: Promise<unknown> = Promise.resolve();
const serialized = <T>(task: () => Promise<T>): Promise<T> => {
  const run = localQueue.then(task, task);
  localQueue = run.catch(() => undefined);
  return run;
};

export async function readBlob<T>(pathname: string, options: { fresh?: boolean } = {}): Promise<BlobDoc<T> | null> {
  const backend = blobBackend();
  if (backend === "none") return null;
  if (backend === "local") {
    const raw = await readLocal(localBlobFile(pathname));
    return raw === null ? null : { value: JSON.parse(raw) as T, etag: etagOf(raw) };
  }
  const result = await get(pathname, { access: "private", useCache: !options.fresh });
  if (!result || result.statusCode !== 200) return null;
  return { value: JSON.parse(await new Response(result.stream).text()) as T, etag: result.blob.etag };
}

async function writeBlob(pathname: string, value: unknown, previousEtag: string | null) {
  const backend = blobBackend();
  if (backend === "none") throw new StoreUnavailableError("Blob no está configurado");
  const content = JSON.stringify(value);
  if (backend === "local") {
    const file = localBlobFile(pathname);
    await serialized(async () => {
      const current = await readLocal(file);
      if ((current === null) !== (previousEtag === null) || (current !== null && etagOf(current) !== previousEtag)) {
        throw new ConflictError();
      }
      await atomicWrite(file, content);
    });
    return;
  }
  try {
    await put(pathname, content, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: previousEtag !== null,
      ...(previousEtag ? { ifMatch: previousEtag } : {}),
    });
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError || /already exists/i.test(String(error))) {
      throw new ConflictError();
    }
    throw error;
  }
}

export async function updateBlob<T>(pathname: string, fallback: T, mutate: (current: T) => T): Promise<T> {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, Math.random() * 30 * attempt));
    const doc = await readBlob<T>(pathname, { fresh: true });
    const next = mutate(doc ? doc.value : structuredClone(fallback));
    try {
      await writeBlob(pathname, next, doc ? doc.etag : null);
      return next;
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error;
    }
  }
  throw new StoreUnavailableError("No se pudo guardar por conflictos repetidos");
}

export async function deleteBlob(pathname: string) {
  const backend = blobBackend();
  if (backend === "none") return;
  if (backend === "local") {
    await rm(localBlobFile(pathname), { force: true });
    return;
  }
  await del(pathname);
}
