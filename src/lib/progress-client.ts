import { useSyncExternalStore } from "react";
import type { GameResult } from "@/games/types";
import { emptyTotals, isEmptyProgress, mergeProgress, type ProgressMap, type Totals } from "./progress-shared";

type Local = {
  totals: ProgressMap;
  pending: ProgressMap;
  streaks: Record<string, number>;
  lastSync: number;
  account: string | null;
};

const KEY = "mates:progress:v1";
export const SYNC_INTERVAL_MS = 15 * 60 * 1000;
export const EXIT_SYNC_MIN_MS = 2 * 60 * 1000;

const listeners = new Set<() => void>();
let cache: Local | null = null;
let syncing = false;
const EMPTY: Local = { totals: {}, pending: {}, streaks: {}, lastSync: 0, account: null };

function load(): Local {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as Local) } : structuredClone(EMPTY);
  } catch {
    cache = structuredClone(EMPTY);
  }
  return cache;
}

function commit(next: Local) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    cache = next;
  }
  listeners.forEach((listener) => listener());
}

export function useTotals(): ProgressMap {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => load().totals,
    () => EMPTY.totals,
  );
}

export const currentAccount = () => load().account;

export function recordResult(slug: string, result: GameResult) {
  if (!result.solved) return;
  const local = load();
  const streak = result.hintsUsed === 0 ? (local.streaks[slug] ?? 0) + 1 : 0;
  const delta: Totals = {
    completed: 1,
    solved: result.hintsUsed === 0 ? 1 : 0,
    hintsUsed: result.hintsUsed,
    bestStreak: streak,
  };
  commit({
    ...local,
    totals: mergeProgress(local.totals, { [slug]: delta }),
    pending: local.account ? mergeProgress(local.pending, { [slug]: delta }) : local.pending,
    streaks: { ...local.streaks, [slug]: streak },
  });
}

export async function syncNow(options: { force?: boolean; exiting?: boolean } = {}) {
  const local = load();
  if (!local.account || syncing || Object.keys(local.pending).length === 0) return;
  const elapsed = Date.now() - local.lastSync;
  if (options.exiting ? elapsed < EXIT_SYNC_MIN_MS : !options.force && elapsed < SYNC_INTERVAL_MS) return;
  syncing = true;
  const sent = local.pending;
  try {
    const response = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sent),
      keepalive: true,
    });
    if (response.status === 401) return leaveAccount();
    if (!response.ok) return;
    commit({ ...load(), pending: {}, lastSync: Date.now() });
  } catch {
    return;
  } finally {
    syncing = false;
  }
}

export async function adoptAccount(username: string) {
  const local = load();
  let server: ProgressMap = {};
  try {
    const response = await fetch("/api/progress", { cache: "no-store" });
    if (response.ok) server = ((await response.json()) as { progress: ProgressMap }).progress;
  } catch {
    server = {};
  }
  const serverEmpty = Object.keys(server).length === 0 || isEmptyProgress(server);
  commit(
    serverEmpty
      ? { ...local, account: username, pending: structuredClone(local.totals), lastSync: 0 }
      : { totals: server, pending: {}, streaks: {}, lastSync: Date.now(), account: username },
  );
  if (serverEmpty) await syncNow({ force: true });
}

export function leaveAccount() {
  commit(structuredClone(EMPTY));
}

export function totalsFor(progress: ProgressMap, slug: string): Totals {
  return progress[slug] ?? emptyTotals();
}
