// Shared domain types for the Dynamic Card feature — the app's core idea: the
// user names a kind of data they want to see ("teach me 10 words", "show me
// Hacker News") and the AI generates a *deck* of cards whose layout is specific
// to that kind. The framework is generic; each "kind" plugs in its own card
// shape, prompt, and renderer, so adding a new data type is additive.
//
// These types are platform-agnostic and shared by both the worker (generation
// + validation) and the client (deck rendering). Card *content* may be Chinese
// (product output); only code/comments are English (public-repo language rule).

/**
 * The registered card kinds. Each kind owns a card shape, a generation prompt,
 * and a frontend renderer. Today only "word" is implemented; future kinds
 * (e.g. "news", "stock") slot in by adding a spec + a renderer.
 */
export type CardKind = "word";

/** A single vocabulary card — one word the user is learning today. */
export interface WordCard {
  /** The headword, e.g. "serendipity". */
  word: string;
  /** IPA pronunciation, e.g. "/ˌser.ənˈdɪp.ə.ti/". */
  phonetic?: string;
  /** Part of speech, short form, e.g. "n." / "adj." / "v.". */
  partOfSpeech?: string;
  /** Concise English definition. */
  definition: string;
  /** Chinese gloss (中文释义). */
  translation: string;
  /** An example sentence using the word (English). */
  example: string;
  /** Chinese translation of the example sentence. */
  exampleTranslation?: string;
  /** A few synonyms for breadth. */
  synonyms?: string[];
  /** A memory hook / etymology note (记忆法/词源). */
  mnemonic?: string;
}

/** Maps a CardKind to the TypeScript shape of one of its cards. */
export interface CardShapeByKind {
  word: WordCard;
}

/**
 * The validated result of one generation call: a titled collection of cards of
 * a single kind, plus provider metadata for display/audit.
 */
export interface CardDeck<K extends CardKind = CardKind> {
  kind: K;
  /** Deck heading, e.g. "今日 10 个单词 · 情绪表达". */
  title: string;
  /** Optional one-line deck subtitle. */
  subtitle?: string;
  /** The cards, all of the deck's kind. */
  cards: CardShapeByKind[K][];
  /** Provider/model metadata (no prompt text). */
  metadata: {
    provider: string;
    model?: string;
  };
}

/** Input to one card-deck generation call. */
export interface CardGenerationInput {
  /** Which kind of card deck to generate. */
  kind: CardKind;
  /**
   * Optional theme / focus the user typed, e.g. "商务英语" or "情绪表达".
   * When empty the kind's generator picks a sensible default set.
   */
  topic?: string;
  /** How many cards to produce; clamped per-kind. */
  count?: number;
  /** Output language for any explanatory text; defaults to zh-CN. */
  locale?: string;
}
