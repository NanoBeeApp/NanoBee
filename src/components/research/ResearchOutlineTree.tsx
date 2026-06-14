// Left-rail outline tree (研究目录) for an open research project — a recursive,
// depth-indented table of contents of the project's nodes, ported from Curve's
// SidePanel (overlays.tsx → `outline-list/outline-row/outline-sub`). Each row
// jumps to that node's reading overlay via the store's openNode; the active node
// is highlighted. Structure
// comes purely from each node's parentId + the store's `order` (same derivation
// as ResearchCanvas) — there are no per-row coordinates; the browser nests the
// <ul>s in normal flow.

import { useMemo } from "react";
import { useResearchStore } from "../../store/useResearchStore";
import { buildChildrenMap } from "../../research/outline";
import type { ResearchNode } from "../../research/types";

export function ResearchOutlineTree() {
  const nodes = useResearchStore((s) => s.nodes);
  const order = useResearchStore((s) => s.order);
  const activeNodeId = useResearchStore((s) => s.activeNodeId);
  const focusNodeId = useResearchStore((s) => s.focusNodeId);
  // Sidebar rows scroll the canvas to the node, pause, then open the overlay.
  const focusAndOpenNode = useResearchStore((s) => s.focusAndOpenNode);

  const childrenOf = useMemo(() => buildChildrenMap(nodes, order), [nodes, order]);

  // Light the clicked row instantly: `focusNodeId` is set the moment a row is
  // clicked (during the scroll-to-card phase); `activeNodeId` only once the
  // reading overlay opens ~1s later. Favouring focus lights it immediately.
  const highlightId = focusNodeId ?? activeNodeId;

  const rootId = order[0];
  const rootChildren = rootId ? (childrenOf[rootId] ?? []) : [];

  if (rootChildren.length === 0) {
    return (
      <div className="nb-side-empty" data-testid="sidebar-outline-empty">
        大纲生成中…
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
          onOpen={focusAndOpenNode}
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
