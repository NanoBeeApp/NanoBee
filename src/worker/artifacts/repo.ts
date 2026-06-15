// D1 persistence for artifacts. Each artifact is one row storing the full card
// deck as a JSON blob, scoped to an owner bucket (signed-in user id, or "anon"
// for signed-out visitors). Mirrors the research repo's storage shape.

import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import type { CardDeck } from "../../cards/types";
import type {
  Artifact,
  DataViewArtifact,
  DataViewItem,
  PipelineStatus,
} from "../../artifacts/types";
import type { DataViewMode, FeedQuery } from "../../artifacts/feed-query";

/** Owner bucket for signed-out visitors. */
export const ANON_OWNER = "anon";

/** Most recent artifacts returned by a list call (page is display-only today). */
const LIST_LIMIT = 100;

/** Items returned by one data-view item-stream page (P1: a single page). */
const ITEMS_LIMIT = 100;

interface ArtifactRow {
  id: string;
  kind: string;
  title: string;
  deck_json: string;
  card_count: number;
  chat_id: string | null;
  favorited: number;
  created_at: number;
  // data_view columns (null for word rows)
  query_json: string | null;
  pipeline_status: string | null;
  source: string | null;
  topic_id: string | null;
  item_count: number | null;
  default_view: string | null;
  last_fetched_at: number | null;
  error_text: string | null;
}

/** Columns every read selects — kept in one place so the shape stays in sync. */
const SELECT_COLS =
  "id, kind, title, deck_json, card_count, chat_id, favorited, created_at, " +
  "query_json, pipeline_status, source, topic_id, item_count, default_view, last_fetched_at, error_text";

function isoOrUndef(unixSeconds: number | null): string | undefined {
  return unixSeconds != null ? new Date(unixSeconds * 1000).toISOString() : undefined;
}

function rowToArtifact(row: ArtifactRow): Artifact | null {
  try {
    if (row.kind === "data_view") {
      return {
        id: row.id,
        kind: "data_view",
        title: row.title,
        source: row.source ?? "",
        query: JSON.parse(row.query_json ?? "{}") as FeedQuery,
        pipelineStatus: (row.pipeline_status ?? "pending") as PipelineStatus,
        itemCount: row.item_count ?? 0,
        defaultView: (row.default_view ?? "card") as DataViewMode,
        topicId: row.topic_id ?? undefined,
        lastFetchedAt: isoOrUndef(row.last_fetched_at),
        errorText: row.error_text ?? undefined,
        chatId: row.chat_id ?? undefined,
        favorited: row.favorited === 1,
        createdAt: new Date(row.created_at * 1000).toISOString(),
      };
    }
    // Legacy word deck.
    return {
      id: row.id,
      kind: "word",
      title: row.title,
      cardCount: row.card_count,
      deck: JSON.parse(row.deck_json) as CardDeck,
      chatId: row.chat_id ?? undefined,
      favorited: row.favorited === 1,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    };
  } catch (error) {
    console.error("[artifacts] corrupt artifact json for", row.id, String(error));
    return null;
  }
}

/** Persist a new artifact and return it (id generated here). */
export async function createArtifact(
  db: D1Database,
  owner: string,
  deck: CardDeck,
  chatId?: string,
): Promise<Artifact> {
  const id = `art_${nanoid(10)}`;
  const cardCount = deck.cards.length;
  await db
    .prepare(
      `INSERT INTO artifacts (id, owner, kind, title, deck_json, card_count, chat_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, owner, deck.kind, deck.title, JSON.stringify(deck), cardCount, chatId ?? null)
    .run();
  return {
    id,
    kind: deck.kind,
    title: deck.title,
    cardCount,
    deck,
    chatId,
    favorited: false,
    createdAt: new Date().toISOString(),
  };
}

/** List an owner's artifacts, newest first (full deck included). */
export async function listArtifacts(
  db: D1Database,
  owner: string,
): Promise<Artifact[]> {
  const { results } = await db
    .prepare(
      `SELECT ${SELECT_COLS} FROM artifacts WHERE owner = ? ORDER BY created_at DESC LIMIT ?`,
    )
    .bind(owner, LIST_LIMIT)
    .all<ArtifactRow>();
  return (results ?? [])
    .map(rowToArtifact)
    .filter((a): a is Artifact => a !== null);
}

/** Load one artifact, or null if it does not exist / is not owned. */
export async function getArtifact(
  db: D1Database,
  owner: string,
  id: string,
): Promise<Artifact | null> {
  const row = await db
    .prepare(
      `SELECT ${SELECT_COLS} FROM artifacts WHERE id = ? AND owner = ?`,
    )
    .bind(id, owner)
    .first<ArtifactRow>();
  return row ? rowToArtifact(row) : null;
}

/**
 * Set the favorited flag on one owned artifact and return the new value, or null
 * if the artifact does not exist / is not owned. Idempotent: writing the same
 * value is a no-op from the caller's perspective.
 */
export async function setArtifactFavorited(
  db: D1Database,
  owner: string,
  id: string,
  favorited: boolean,
): Promise<boolean | null> {
  const res = await db
    .prepare(
      "UPDATE artifacts SET favorited = ? WHERE id = ? AND owner = ?",
    )
    .bind(favorited ? 1 : 0, id, owner)
    .run();
  // D1 reports affected rows under meta.changes; 0 ⇒ no such owned row.
  const changed = res.meta?.changes ?? 0;
  return changed > 0 ? favorited : null;
}

/** Delete one artifact (and its data-view items, if any). */
export async function deleteArtifact(
  db: D1Database,
  owner: string,
  id: string,
): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM artifacts WHERE id = ? AND owner = ?").bind(id, owner),
    db.prepare("DELETE FROM data_view_items WHERE view_id = ? AND owner = ?").bind(id, owner),
  ]);
}

// ---------------------------------------------------------------------------
// Data views (kind = 'data_view') — the redefined Artifacts feature.
// ---------------------------------------------------------------------------

/** Persist a new data view in the 'pending' pipeline state and return it. */
export async function createDataViewArtifact(
  db: D1Database,
  owner: string,
  query: FeedQuery,
  topicId: string | null,
  chatId?: string,
): Promise<DataViewArtifact> {
  const id = `art_${nanoid(10)}`;
  await db
    .prepare(
      `INSERT INTO artifacts
         (id, owner, kind, title, deck_json, card_count, chat_id,
          source, query_json, pipeline_status, topic_id, item_count, default_view)
       VALUES (?, ?, 'data_view', ?, '{}', 0, ?, ?, ?, 'pending', ?, 0, ?)`,
    )
    .bind(
      id,
      owner,
      query.title,
      chatId ?? null,
      query.source,
      JSON.stringify(query),
      topicId,
      query.defaultView,
    )
    .run();
  return {
    id,
    kind: "data_view",
    title: query.title,
    source: query.source,
    query,
    pipelineStatus: "pending",
    itemCount: 0,
    defaultView: query.defaultView,
    topicId: topicId ?? undefined,
    chatId,
    favorited: false,
    createdAt: new Date().toISOString(),
  };
}

/** Update a data view's pipeline stage (+ optional item count / fetch stamp /
 *  error). Keyed by id only — the pipeline runs server-side with a trusted id. */
export async function setPipelineStatus(
  db: D1Database,
  id: string,
  status: PipelineStatus,
  extra: { itemCount?: number; markFetched?: boolean; errorText?: string | null } = {},
): Promise<void> {
  const sets = ["pipeline_status = ?"];
  const binds: (string | number | null)[] = [status];
  if (extra.itemCount !== undefined) {
    sets.push("item_count = ?");
    binds.push(extra.itemCount);
  }
  if (extra.markFetched) sets.push("last_fetched_at = unixepoch()");
  if (extra.errorText !== undefined) {
    sets.push("error_text = ?");
    binds.push(extra.errorText);
  }
  binds.push(id);
  await db
    .prepare(`UPDATE artifacts SET ${sets.join(", ")} WHERE id = ?`)
    .bind(...binds)
    .run();
}

/** One normalized item ready to persist (raw kept whole for card binding). */
export interface NormalizedItemInput {
  raw: Record<string, unknown>;
  contentHash: string;
  externalId?: string;
  /** Item's own timestamp in unix seconds, when known. */
  itemCreatedAt?: number;
}

/**
 * Insert items (dedup via the UNIQUE(view_id, content_hash) index), then
 * recompute item_count once with a COUNT() — never an in-place increment, so
 * there is no high-frequency write race. Returns the new total item count.
 */
export async function upsertDataViewItems(
  db: D1Database,
  viewId: string,
  owner: string,
  source: string,
  items: NormalizedItemInput[],
): Promise<number> {
  if (items.length) {
    const stmts = items.map((it) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO data_view_items
             (id, view_id, owner, source, source_external_id, content_hash, raw_json, item_created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          `dvi_${nanoid(10)}`,
          viewId,
          owner,
          source,
          it.externalId ?? null,
          it.contentHash,
          JSON.stringify(it.raw),
          it.itemCreatedAt ?? null,
        ),
    );
    await db.batch(stmts);
  }
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM data_view_items WHERE view_id = ?")
    .bind(viewId)
    .first<{ n: number }>();
  const n = row?.n ?? 0;
  await db.prepare("UPDATE artifacts SET item_count = ? WHERE id = ?").bind(n, viewId).run();
  return n;
}

interface DataViewItemRow {
  id: string;
  source: string;
  source_external_id: string | null;
  raw_json: string;
  item_created_at: number | null;
}

/** Map a stored row's raw source item onto the normalized DataViewItem shape. */
function rowToDataViewItem(row: DataViewItemRow): DataViewItem | null {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(row.raw_json) as Record<string, unknown>;
  } catch {
    return null;
  }
  const r = raw as Record<string, unknown>;
  const pick = (...keys: string[]): string | undefined => {
    for (const k of keys) if (typeof r[k] === "string" && r[k]) return r[k] as string;
    return undefined;
  };
  const num = (...keys: string[]): number | undefined => {
    for (const k of keys) if (typeof r[k] === "number") return r[k] as number;
    return undefined;
  };
  return {
    id: row.id,
    externalId: row.source_external_id ?? undefined,
    title: pick("title", "headline", "name", "text") ?? "(untitled)",
    url: pick("url", "link"),
    summary: pick("summary", "description", "snippet", "abstract"),
    author: pick("author", "by", "username"),
    points: num("points", "score"),
    comments: num("comments", "num_comments", "commentCount"),
    itemCreatedAt: pick("createdAt", "created_at", "publishedAt", "date") ?? isoOrUndef(row.item_created_at),
    source: row.source,
    raw,
  };
}

/** List one data view's items, newest first (P1: a single page, owner-scoped). */
export async function listDataViewItems(
  db: D1Database,
  owner: string,
  viewId: string,
  limit = ITEMS_LIMIT,
): Promise<DataViewItem[]> {
  const capped = Math.min(Math.max(limit, 1), ITEMS_LIMIT);
  const { results } = await db
    .prepare(
      `SELECT id, source, source_external_id, raw_json, item_created_at
         FROM data_view_items
        WHERE view_id = ? AND owner = ?
        ORDER BY inserted_at DESC, rowid DESC
        LIMIT ?`,
    )
    .bind(viewId, owner, capped)
    .all<DataViewItemRow>();
  return (results ?? [])
    .map(rowToDataViewItem)
    .filter((i): i is DataViewItem => i !== null);
}

/** Update a data view's editable meta (title / default view). Returns false if
 *  no such owned data_view row. */
export async function updateDataViewMeta(
  db: D1Database,
  owner: string,
  id: string,
  patch: { title?: string; defaultView?: DataViewMode },
): Promise<boolean> {
  const sets: string[] = [];
  const binds: (string | number)[] = [];
  if (patch.title !== undefined) {
    sets.push("title = ?");
    binds.push(patch.title);
  }
  if (patch.defaultView !== undefined) {
    sets.push("default_view = ?");
    binds.push(patch.defaultView);
  }
  if (!sets.length) return true;
  binds.push(id, owner);
  const res = await db
    .prepare(`UPDATE artifacts SET ${sets.join(", ")} WHERE id = ? AND owner = ? AND kind = 'data_view'`)
    .bind(...binds)
    .run();
  return (res.meta?.changes ?? 0) > 0;
}
