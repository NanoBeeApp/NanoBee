// Browser-local cache of research project snapshots. D1 is the cross-device
// source of truth; this cache is the same-browser safety net so a deep link
// still opens after a failed or delayed persist (missing table, network blip,
// refresh mid-generation). Mirrors canvas-viewport.ts: localStorage, LRU, and
// silent no-ops when storage is unavailable (privacy mode / SSR / quota).

import type { ResearchProjectMeta, ResearchSnapshot } from "./types";

const STORAGE_KEY = "nanobee.research.snapshots";
const MAX_ENTRIES = 40;

type SnapshotMap = Record<string, ResearchSnapshot>;

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Structural guard for a cached snapshot blob. */
export function isResearchSnapshot(value: unknown): value is ResearchSnapshot {
  if (!value || typeof value !== "object") return false;
  const snap = value as Record<string, unknown>;
  return (
    typeof snap.projectId === "string" &&
    snap.projectId.length > 0 &&
    typeof snap.title === "string" &&
    snap.title.length > 0 &&
    typeof snap.topic === "string" &&
    snap.topic.length > 0 &&
    !!snap.nodes &&
    typeof snap.nodes === "object" &&
    !Array.isArray(snap.nodes) &&
    Array.isArray(snap.order) &&
    typeof snap.updatedAt === "string"
  );
}

function readMap(): SnapshotMap {
  const store = safeStorage();
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: SnapshotMap = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (isResearchSnapshot(value) && value.projectId === id) out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: SnapshotMap): void {
  const store = safeStorage();
  if (!store) return;
  const keys = Object.keys(map);
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(map));
    return;
  } catch {
    /* quota — evict oldest, then retry */
  }
  for (let i = 0; i < keys.length; i++) {
    delete map[keys[i]];
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(map));
      return;
    } catch {
      /* keep evicting */
    }
  }
  console.error("[research] snapshot cache write failed: quota");
}

function metaOf(snap: ResearchSnapshot): ResearchProjectMeta {
  return {
    id: snap.projectId,
    title: snap.title,
    topic: snap.topic,
    updatedAt: snap.updatedAt,
    nodeCount: Object.keys(snap.nodes).length,
  };
}

/** Persist a snapshot locally (LRU by write order). */
export function cacheSnapshot(snapshot: ResearchSnapshot): void {
  if (!isResearchSnapshot(snapshot)) return;
  const map = readMap();
  delete map[snapshot.projectId];
  map[snapshot.projectId] = snapshot;
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    for (const stale of keys.slice(0, keys.length - MAX_ENTRIES)) delete map[stale];
  }
  writeMap(map);
}

/** Load one cached snapshot, or null. */
export function loadCachedSnapshot(projectId: string): ResearchSnapshot | null {
  if (!projectId) return null;
  const snap = readMap()[projectId];
  return isResearchSnapshot(snap) ? snap : null;
}

/** Metadata for every locally cached project (newest first). */
export function listCachedProjects(): ResearchProjectMeta[] {
  return Object.values(readMap())
    .map(metaOf)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/**
 * Merge server + local lists. When both have the same id, the newer
 * `updatedAt` wins so a failed D1 persist does not hide a fresher local copy.
 */
export function mergeProjectLists(
  server: ResearchProjectMeta[],
  local: ResearchProjectMeta[],
): ResearchProjectMeta[] {
  const map = new Map<string, ResearchProjectMeta>();
  for (const item of local) map.set(item.id, item);
  for (const item of server) {
    const prev = map.get(item.id);
    if (!prev || item.updatedAt >= prev.updatedAt) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

/** Pick the newer of two snapshots; `preferred` wins ties / when `other` is null. */
export function newerSnapshot(
  preferred: ResearchSnapshot | null,
  other: ResearchSnapshot | null,
): ResearchSnapshot | null {
  if (!preferred) return other;
  if (!other) return preferred;
  return other.updatedAt > preferred.updatedAt ? other : preferred;
}
