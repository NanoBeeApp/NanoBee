// Left-rail outline tree (研究目录) for an open research project — a recursive,
// depth-indented table of contents of the project's nodes, ported from Curve's
// SidePanel (overlays.tsx → `outline-list/outline-row/outline-sub`). Each row
// opens that node's reading overlay immediately via the store's `openNode` (the
// canvas also scrolls to the node behind it); the current node is highlighted.
// Structure comes purely from each node's parentId + the store's `order` (same
// derivation as ResearchCanvas) — there are no per-row coordinates; the browser
// nests the <ul>s in normal flow.

import { useMemo } from "react";
import { useResearchStore } from "../../store/useResearchStore";
import { buildChildrenMap } from "../../research/outline";
import { Icons } from "../../icons/icons";
import type { ResearchNode } from "../../research/types";

export function ResearchOutlineTree() {
  const nodes = useResearchStore((s) => s.nodes);
  const order = useResearchStore((s) => s.order);
  const highlightedNodeId = useResearchStore((s) => s.highlightedNodeId);
  // Clicking a row opens the reading overlay immediately (no scroll-then-wait).
  const openNode = useResearchStore((s) => s.openNode);
  const retryOutline = useResearchStore((s) => s.retryOutline);

  const childrenOf = useMemo(() => buildChildrenMap(nodes, order), [nodes, order]);

  // The lit row mirrors the canvas highlight, which persists after the overlay
  // closes (cleared only by a blank-canvas press or opening another node).
  const highlightId = highlightedNodeId;

  const rootId = order[0];
  const root = rootId ? nodes[rootId] : undefined;
  const rootChildren = rootId ? (childrenOf[rootId] ?? []) : [];

  if (rootChildren.length === 0) {
    const failed = root?.status === "failed";
    return (
      <div className="nb-side-empty" data-testid="sidebar-outline-empty">
        {failed ? (
          <>
            <p>大纲生成失败</p>
            <button
              type="button"
              className="nb-outline-retry"
              onClick={() => void retryOutline()}
              data-testid="sidebar-outline-retry">
              <Icons.redo size={14} /> 重新生成
            </button>
          </>
        ) : (
          "大纲生成中…"
        )}
      </div>
    );
  }

  return (
    <ul className="nb-outline-list" data-testid="sidebar-outline-tree">
      {rootChildren.map((id) => (
        <OutlineRow
          key={id}
          id={id}
          nodes={nodes}
          childrenOf={childrenOf}
          highlightId={highlightId}
          onOpen={openNode}
        />
      ))}
    </ul>
  );
}

interface OutlineRowProps {
  id: string;
  nodes: Record<string, ResearchNode>;
  childrenOf: Record<string, string[]>;
  /** The row to light up: the focused (being-scrolled-to) or active node. */
  highlightId: string | null;
  onOpen: (id: string) => void;
}

/** One outline node + its indented children (a nested <ul> rail). */
function OutlineRow({ id, nodes, childrenOf, highlightId, onOpen }: OutlineRowProps) {
  const node = nodes[id];
  if (!node) return null;
  const kids = childrenOf[id] ?? [];
  const current = id === highlightId;

  return (
    <li>
      <button
        type="button"
        className={`nb-outline-row${current ? " is-current" : ""}`}
        onClick={() => onOpen(id)}
        title={node.title}
        data-testid={`sidebar-outline-row-${id}`}>
        <span className="nb-outline-text">{node.title}</span>
      </button>
      {kids.length > 0 && (
        <ul className="nb-outline-sub">
          {kids.map((cid) => (
            <OutlineRow
              key={cid}
              id={cid}
              nodes={nodes}
              childrenOf={childrenOf}
              highlightId={highlightId}
              onOpen={onOpen}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
