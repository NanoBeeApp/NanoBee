// Per-topic canvas viewport memory. Every research project (topic) gets its own
// saved pan + zoom, so switching topics — and reloading the page — restores the
// exact place the user left that topic's canvas instead of re-centering.
//
// Why localStorage (not the D1 snapshot or the URL): the pan offset is in screen
// pixels relative to the viewport width, so it is per-device view state with no
// business syncing across devices/screen sizes; and it changes on every pan/wheel
// frame, far too hot for the server snapshot. Browser-native storage also keeps
// the agent/runtime core untouched (see CLAUDE.md runtime principles) — nothing
// here assumes Node or a filesystem, and every access degrades gracefully when
// storage is unavailable (privacy mode, SSR).

export interface CanvasViewport {
  tx: number;
  ty: number;
  scale: number;
}

const STORAGE_KEY = "nanobee.research.viewports";
// Cap how many topics we remember so the map can't grow without bound. The
// least-recently-saved entries are evicted first (insertion-order LRU).
const MAX_ENTRIES = 60;

type ViewportMap = Record<string, CanvasViewport>;

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    // Access itself can throw (storage disabled / blocked) — degrade to no-op.
    return null;
  }
}

function isViewport(v: unknown): v is CanvasViewport {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (
    typeof c.tx === "number" &&
    typeof c.ty === "number" &&
    typeof c.scale === "number" &&
    Number.isFinite(c.tx) &&
    Number.isFinite(c.ty) &&
    Number.isFinite(c.scale)
  );
}

function readMap(): ViewportMap {
  const store = safeStorage();
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as ViewportMap;
  } catch {
    return {};
  }
}

function writeMap(map: ViewportMap): void {
  const store = safeStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Quota / serialization failure — viewport memory is best-effort, so ignore.
  }
}

/** The saved pan/zoom for a topic, or null if never saved (or stored invalid). */
export function loadViewport(projectId: string | null | undefined): CanvasViewport | null {
  if (!projectId) return null;
  const v = readMap()[projectId];
  return isViewport(v) ? { tx: v.tx, ty: v.ty, scale: v.scale } : null;
}

/** Remember a topic's pan/zoom. Re-inserts the key so it counts as most-recent. */
export function saveViewport(
  projectId: string | null | undefined,
  viewport: CanvasViewport,
): void {
  if (!projectId || !isViewport(viewport)) return;
  const map = readMap();
  // Re-insert at the end so it ranks as most-recently-used for eviction.
  delete map[projectId];
  map[projectId] = { tx: viewport.tx, ty: viewport.ty, scale: viewport.scale };
  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    for (const stale of keys.slice(0, keys.length - MAX_ENTRIES)) delete map[stale];
  }
  writeMap(map);
}
