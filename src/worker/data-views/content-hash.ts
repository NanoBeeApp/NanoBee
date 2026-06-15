// The single authoritative content-hash for data-view items. Every place that
// dedupes items (the pipeline, future cron refresh, today-feed dedup in P2/P3)
// imports this — never reimplement it, or the same item would hash differently
// and slip past INSERT OR IGNORE.
//
// Hash basis: the source's own id when present (stable across re-fetches),
// otherwise title+url. SHA-256 via WebCrypto (Workers global + Node ≥19), hex
// truncated to 24 chars (96 bit) — ample for per-view dedup.

/** Pull the source item's own id, trying the common field names. */
function externalId(raw: Record<string, unknown>): string | undefined {
  const r = raw as Record<string, unknown>;
  const cand = r.id ?? r.objectID ?? r.guid ?? r.url ?? r.link;
  return cand != null ? String(cand) : undefined;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

/** Stable 24-char hex content hash for one source item. */
export async function computeContentHash(
  sourceId: string,
  raw: Record<string, unknown>,
): Promise<string> {
  const ext = raw.id ?? (raw as Record<string, unknown>).objectID ?? (raw as Record<string, unknown>).guid;
  const basis =
    ext != null
      ? `${sourceId}:${String(ext)}`
      : `${str(raw.title)}:${str((raw as Record<string, unknown>).url ?? (raw as Record<string, unknown>).link)}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(basis));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

export { externalId };
