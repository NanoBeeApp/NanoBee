// Per-node highlight persistence (ported from Curve's reading-interactions.ts).
// Stores the text phrases the reader marked as highlights, keyed by
// project + node, so they re-appear (re-wrapped in <mark>) on reopen.
// Browser-local (localStorage) only; nothing is uploaded.

const STORAGE_KEY = "nanobee.research.reading-highlights.v1";
const MAX_ENTRIES = 200;

type HighlightMap = Record<string, { texts: string[]; updatedAt: number }>;

function entryKey(projectId: string | null | undefined, nodeId: string): string {
  return `${projectId ?? "anon"}::${nodeId}`;
}

function readMap(): HighlightMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as HighlightMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: HighlightMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage full / disabled → give up silently.
  }
}

export function loadHighlights(
  projectId: string | null | undefined,
  nodeId: string,
): string[] {
  return readMap()[entryKey(projectId, nodeId)]?.texts ?? [];
}

export function saveHighlights(
  projectId: string | null | undefined,
  nodeId: string,
  texts: string[],
): void {
  const map = readMap();
  const key = entryKey(projectId, nodeId);

  if (!texts.length) {
    delete map[key];
  } else {
    map[key] = { texts, updatedAt: Date.now() };
  }

  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (map[a]?.updatedAt ?? 0) - (map[b]?.updatedAt ?? 0))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((k) => delete map[k]);
  }

  writeMap(map);
}
