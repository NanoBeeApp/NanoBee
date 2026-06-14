// Shared outline-structure helpers for the Research Canvas. The canvas and the
// sidebar both render the same node hierarchy (one as an in-canvas outline, the
// other as a left-rail table of contents), so the parent→children derivation
// lives here once instead of being copied into each view.

import type { ResearchNode } from "./types";

/**
 * Parent id → ordered child ids, derived from the flat node map + the snapshot
 * `order`. `order` fixes sibling order (root first); a node with no parent
 * (the root) simply never appears as a value, so callers start from the root id.
 */
export function buildChildrenMap(
  nodes: Record<string, ResearchNode>,
  order: string[],
): Record<string, string[]> {
  const childrenOf: Record<string, string[]> = {};
  for (const id of order) {
    const parentId = nodes[id]?.parentId;
    if (parentId) (childrenOf[parentId] ??= []).push(id);
  }
  return childrenOf;
}
