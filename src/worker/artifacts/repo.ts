// D1 persistence for artifacts. Each artifact is one row storing the full card
// deck as a JSON blob, scoped to an owner bucket (signed-in user id, or "anon"
// for signed-out visitors). Mirrors the research repo's storage shape.

import type { D1Database } from "@cloudflare/workers-types";
import { nanoid } from "nanoid";
import type { CardDeck } from "../../cards/types";
import type { Artifact } from "../../artifacts/types";

/** Owner bucket for signed-out visitors. */
export const ANON_OWNER = "anon";

/** Most recent artifacts returned by a list call (page is display-only today). */
const LIST_LIMIT = 100;

interface ArtifactRow {
  id: string;
  kind: string;
  title: string;
  deck_json: string;
  card_count: number;
  chat_id: string | null;
  favorited: number;
  created_at: number;
}

/** Columns every read selects — kept in one place so the shape stays in sync. */
const SELECT_COLS =
  "id, kind, title, deck_json, card_count, chat_id, favorited, created_at";

function rowToArtifact(row: ArtifactRow): Artifact | null {
  try {
    return {
      id: row.id,
      kind: row.kind as Artifact["kind"],
      title: row.title,
      cardCount: row.card_count,
      deck: JSON.parse(row.deck_json) as CardDeck,
      chatId: row.chat_id ?? undefined,
      favorited: row.favorited === 1,
      createdAt: new Date(row.created_at * 1000).toISOString(),
    };
  } catch (error) {
    console.error("[artifacts] corrupt deck json for", row.id, String(error));
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

/** Delete one artifact. */
export async function deleteArtifact(
  db: D1Database,
  owner: string,
  id: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM artifacts WHERE id = ? AND owner = ?")
    .bind(id, owner)
    .run();
}
