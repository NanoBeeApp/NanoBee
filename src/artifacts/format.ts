// Shared display formatting for artifacts — the kind label and the meta line
// ("单词 · 10 张"). Centralized here so the card / row / table renderers and the
// sidebar list all read from one place instead of redefining KIND_LABEL.

import type { Artifact } from "./types";

/** Map a card kind to a short human label. */
const KIND_LABEL: Record<string, string> = { word: "单词" };

/** Human label for a card kind (falls back to the raw kind). */
export function kindLabel(kind: string): string {
  return KIND_LABEL[kind] ?? kind;
}

/** The one-line meta shown under/next to a deck title, e.g. "单词 · 10 张". */
export function artifactMeta(a: Pick<Artifact, "kind" | "cardCount">): string {
  return `${kindLabel(a.kind)} · ${a.cardCount} 张`;
}
