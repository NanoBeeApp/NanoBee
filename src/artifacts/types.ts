// Shared domain types for Artifacts. An artifact is a saved, browsable piece of
// data produced from a chat message. There are two kinds, discriminated by
// `kind`:
//   - "data_view"  — the core: a chat-generated view over a public data source
//     (e.g. "Hacker News filtered to AI posts"), backed by a FeedQuery + a
//     fetched/aggregated item stream. This is the redefined Artifacts feature.
//   - "word"       — legacy card deck (English vocabulary). Kept so existing
//     decks still render; no new word artifacts are created.
//
// Platform-agnostic: shared by the worker (persistence + the chat tool) and the
// client (the Artifacts page + the inline chat reference).

import type { CardDeck } from "../cards/types";
import type { FeedQuery, DataViewMode } from "./feed-query";

/** The async data pipeline's stage for a data view. P1 only emits
 *  pending → fetching → ready | error; filtering/extracting/templating are
 *  reserved for the P2/P3 AI stages. */
export type PipelineStatus =
  | "pending"
  | "fetching"
  | "filtering"
  | "extracting"
  | "templating"
  | "ready"
  | "error";

/** Legacy card-deck artifact (English vocabulary). */
export interface WordDeckArtifact {
  id: string;
  kind: "word";
  /** Display title (the deck's title). */
  title: string;
  /** Number of cards in the deck (denormalized for list display). */
  cardCount: number;
  /** The generated card deck. */
  deck: CardDeck;
  chatId?: string;
  favorited: boolean;
  createdAt: string;
}

/** A chat-generated data view (the core Artifacts feature). */
export interface DataViewArtifact {
  id: string;
  kind: "data_view";
  /** Display title, e.g. "Hacker News · AI 相关帖子". */
  title: string;
  /** Data-hub source id this view pulls from. */
  source: string;
  /** The structured query backing the view. */
  query: FeedQuery;
  /** Current async pipeline stage. */
  pipelineStatus: PipelineStatus;
  /** Number of items currently in the view (denormalized). */
  itemCount: number;
  /** Last-used / default rendering mode. */
  defaultView: DataViewMode;
  /** Topic class for today-feed grouping (P2/P3); may be absent. */
  topicId?: string;
  /** ISO timestamp of the last successful fetch, when known. */
  lastFetchedAt?: string;
  /** Last pipeline error message, when status is "error". */
  errorText?: string;
  chatId?: string;
  favorited: boolean;
  createdAt: string;
}

/** A full artifact: either a data view or a legacy word deck. */
export type Artifact = WordDeckArtifact | DataViewArtifact;

/** One row of a data view's item stream (source-shaped fields normalized). */
export interface DataViewItem {
  /** data_view_items row id. */
  id: string;
  /** The source's own id for the item, when present. */
  externalId?: string;
  title: string;
  url?: string;
  /** Raw summary/description from the source (AI summary comes in P2). */
  summary?: string;
  author?: string;
  points?: number;
  comments?: number;
  /** The item's own timestamp (ISO), when the source provides one. */
  itemCreatedAt?: string;
  source: string;
  /** Full source item, for dynamic card binding. */
  raw: Record<string, unknown>;
}

/**
 * A lightweight reference attached to the AI chat message that created the
 * artifact. The chat renders it as a clickable card opening the Artifacts page.
 */
export type ArtifactRef =
  | { id: string; kind: "word"; title: string; cardCount: number }
  | {
      id: string;
      kind: "data_view";
      title: string;
      itemCount: number;
      pipelineStatus: PipelineStatus;
    };
