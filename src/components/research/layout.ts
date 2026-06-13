// Tidy-tree layout for the research canvas: assigns each node an (x, y) so the
// tree reads top-down, parents centered over their children. Pure function —
// the store calls it whenever the node set changes and stores the coordinates
// on the nodes (so a reloaded snapshot restores the exact layout).

import type { ResearchNode } from "../../research/types";

export const NODE_W = 256;
export const NODE_H = 132;
const H_GAP = 36;
const V_GAP = 104;

/** Compute { id: {x, y} } positions for a node map, ordered by `order`. */
export function layoutNodes(
  nodes: Record<string, ResearchNode>,
  order: string[],
): Record<string, { x: number; y: number }> {
  const childrenOf: Record<string, string[]> = {};
  let rootId: string | null = null;
  for (const id of order) {
    const node = nodes[id];
    if (!node) continue;
    if (node.isRoot || node.parentId === null) rootId = rootId ?? id;
    if (node.parentId) (childrenOf[node.parentId] ??= []).push(id);
  }
  // Keep child order stable (follow `order`).
  for (const pid of Object.keys(childrenOf)) {
    childrenOf[pid].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }

  const pos: Record<string, { x: number; y: number }> = {};
  let cursor = 0;

  function place(id: string, depth: number): number {
    const kids = childrenOf[id] ?? [];
    const y = depth * (NODE_H + V_GAP);
    if (kids.length === 0) {
      const x = cursor * (NODE_W + H_GAP);
      cursor += 1;
      pos[id] = { x, y };
      return x;
    }
    const xs = kids.map((k) => place(k, depth + 1));
    const x = (xs[0] + xs[xs.length - 1]) / 2;
    pos[id] = { x, y };
    return x;
  }

  if (rootId) place(rootId, 0);
  // Any orphans (shouldn't happen) get parked in a trailing row.
  for (const id of order) {
    if (!pos[id]) {
      pos[id] = { x: cursor * (NODE_W + H_GAP), y: 0 };
      cursor += 1;
    }
  }
  return pos;
}
