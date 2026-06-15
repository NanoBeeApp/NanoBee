// Shared domain types for Artifacts — a dynamically generated piece of data
// produced from a chat message. Today every artifact wraps a card deck (see
// src/cards), but the envelope is deliberately deck-agnostic so other artifact
// payloads can be added later.
//
// Platform-agnostic: shared by the worker (persistence + the chat tool) and the
// client (the Artifacts page + the inline chat reference).

import type { CardDeck, CardKind } from "../cards/types";

/** A full artifact: metadata + the generated deck payload. */
export interface Artifact {
  id: string;
  /** Card kind of the deck, e.g. "word". */
  kind: CardKind;
  /** Display title (the deck's title). */
  title: string;
  /** Number of cards in the deck (denormalized for list display). */
  cardCount: number;
  /** The generated card deck. */
  deck: CardDeck;
  /** The chat this artifact was generated from, if any. */
  chatId?: string;
  /** Whether the owner has favorited this artifact (the "你收藏的" tab). */
  favorited: boolean;
  /** ISO creation timestamp. */
  createdAt: string;
}

/**
 * A lightweight reference to an artifact, attached to the AI chat message that
 * created it. The chat renders this as a clickable card that opens the
 * Artifacts page focused on the artifact; the full deck is loaded there.
 */
export interface ArtifactRef {
  id: string;
  kind: CardKind;
  title: string;
  cardCount: number;
}
