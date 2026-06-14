// Per-node reading scroll-position memory (ported from Curve's reading-progress.ts).
// Stores the reading overlay's scrollTop keyed by project + node so reopening a
// node returns the reader to where they left off. Browser-local only
// (localStorage); nothing is uploaded.

const STORAGE_KEY = "nanobee.research.reading-progress.v1";
const MAX_ENTRIES = 200;

interface ReadingProgressEntry {
  scrollTop: number;
  updatedAt: number;
}

type ReadingProgressMap = Record<string, ReadingProgressEntry>;

function entryKey(projectId: string | null | undefined, nodeId: string): string {
  return `${projectId ?? "anon"}::${nodeId}`;
}

function readMap(): ReadingProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ReadingProgressMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: ReadingProgressMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage full / disabled → give up silently, never break reading.
  }
}

export function loadReadingProgress(
  projectId: string | null | undefined,
  nodeId: string,
): number {
  const entry = readMap()[entryKey(projectId, nodeId)];
  return entry?.scrollTop ?? 0;
}

export function saveReadingProgress(
  projectId: string | null | undefined,
  nodeId: string,
  scrollTop: number,
): void {
  const map = readMap();
  const key = entryKey(projectId, nodeId);

  if (scrollTop <= 0) {
    delete map[key];
  } else {
    map[key] = { scrollTop: Math.round(scrollTop), updatedAt: Date.now() };
  }

  // Soft LRU cap: evict the oldest entries past MAX_ENTRIES so the map can't
  // grow without bound.
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (map[a]?.updatedAt ?? 0) - (map[b]?.updatedAt ?? 0))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete map[k]);
  }

  writeMap(map);
}
