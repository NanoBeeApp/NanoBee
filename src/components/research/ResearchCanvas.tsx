// The research canvas: a pan/zoom viewport that renders the node tree as a
// nested outline (hierarchical view) — a research-topic banner followed by the
// outline items, each indented under its parent along a vertical rail. This is
// the default and only canvas layout, ported from Curve's OutlineTree/NodeBranch
// (NOT a top-down tidy-tree diagram).
//
// Interaction invariants ported from Curve:
//  - enters at a comfortable reading scale (not fit-all-to-one-screen),
//  - drag the background to pan, wheel/pinch to zoom around the cursor.
// Structure comes purely from each node's parentId + the store's `order`; there
// are no per-node coordinates — the browser lays the outline out in normal flow.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useResearchStore } from "../../store/useResearchStore";
import { ResearchNodeCard } from "./ResearchNodeCard";
import { ResearchTraceLauncher } from "./ResearchTraceLauncher";
import { buildChildrenMap } from "../../research/outline";
import { loadViewport, saveViewport } from "./canvas-viewport";
import type { ResearchNode } from "../../research/types";

interface Transform {
  tx: number;
  ty: number;
  scale: number;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 1.6;
const INITIAL_SCALE = 1;
// Fixed-width outline column (world units). Kept narrow enough to read like an
// article column; per-depth cards shrink further via CSS max-width.
const OUTLINE_WIDTH = 760;

// Placeholder outline rows shown in the main canvas while the AI is generating
// the outline (root still `loading`, no children yet). They mimic the shape of
// the incoming tree — a couple of nested rows hint at the hierarchy — so the
// content area reads as "the outline is loading here", not empty. Widths/indents
// are fixed (deterministic) and purely decorative; keys are stable indices.
const OUTLINE_SKELETON: ReadonlyArray<{ indent: number; title: string; brief: string }> = [
  { indent: 0, title: "58%", brief: "86%" },
  { indent: 0, title: "46%", brief: "72%" },
  { indent: 30, title: "40%", brief: "64%" },
  { indent: 30, title: "50%", brief: "68%" },
  { indent: 0, title: "54%", brief: "80%" },
];

export function ResearchCanvas() {
  const nodes = useResearchStore((s) => s.nodes);
  const order = useResearchStore((s) => s.order);
  const activeNodeId = useResearchStore((s) => s.activeNodeId);
  const openNode = useResearchStore((s) => s.openNode);
  const projectHighlighted = useResearchStore((s) => s.projectHighlighted);
  const clearProjectHighlight = useResearchStore((s) => s.clearProjectHighlight);
  const highlightedNodeId = useResearchStore((s) => s.highlightedNodeId);
  const clearNodeHighlight = useResearchStore((s) => s.clearNodeHighlight);
  const projectId = useResearchStore((s) => s.projectId);
  // The outline-generation trace is stashed under the root node's id (order[0]).
  const traces = useResearchStore((s) => s.traces);

  const viewportRef = useRef<HTMLDivElement>(null);
  // Each topic remembers its own pan/zoom (see canvas-viewport.ts). The canvas is
  // re-mounted per topic (`key={projectId}` in ResearchView), so we can simply
  // *initialise* the transform from this topic's saved viewport — no effect, no
  // switch-time bookkeeping. A topic with no saved viewport starts at a sentinel
  // and gets centered by the effect below.
  const [t, setT] = useState<Transform>(
    () => loadViewport(projectId) ?? { tx: 0, ty: 0, scale: INITIAL_SCALE },
  );
  const centeredFor = useRef<string>("");
  // Mirror of `t` (written in an effect, never during render) so the unmount
  // flush below can persist the latest transform without re-subscribing.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);
  const scrolledTo = useRef<string>("");
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  const rootId = order[0];
  const root = rootId ? nodes[rootId] : null;
  const outlineTrace = rootId ? traces[rootId] : undefined;
  const childrenOf = useMemo(() => buildChildrenMap(nodes, order), [nodes, order]);

  // Center the fixed-width outline column for a *new* topic (no saved viewport):
  // once on the bare root ("seed") and once when the full outline lands ("tree");
  // growing children afterwards keeps the same key so the view doesn't jump. A
  // topic restored from a saved viewport keeps its initialised transform untouched.
  useEffect(() => {
    if (!rootId) return;
    if (loadViewport(projectId)) return; // restored topic → don't re-center over it
    const key = order.length <= 1 ? "seed" : "tree";
    if (centeredFor.current === key) return;
    const vp = viewportRef.current;
    if (!vp) return;
    centeredFor.current = key;
    const tx = (vp.clientWidth - OUTLINE_WIDTH * INITIAL_SCALE) / 2;
    setT({ tx: Math.max(24, tx), ty: 40, scale: INITIAL_SCALE });
  }, [rootId, order.length, projectId]);

  // Persist this topic's pan/zoom (debounced) on every change, so the per-topic
  // memory survives a full page reload, not just in-session switches.
  useEffect(() => {
    if (!projectId) return;
    const id = setTimeout(() => saveViewport(projectId, t), 350);
    return () => clearTimeout(id);
  }, [projectId, t]);

  // Flush on unmount (switching topics re-mounts via the key; starting a new
  // research unmounts the canvas) so a just-made pan/zoom isn't lost to the
  // debounce window.
  useEffect(
    () => () => {
      if (projectId) saveViewport(projectId, tRef.current);
    },
    [projectId],
  );

  // Nudge `ty` so the given node's card sits ~22% down the viewport. The world is
  // positioned with a CSS transform, not a native scrollbar, so "scroll" means
  // moving `ty`. Vertical-only (the fixed-width column is already centered); a
  // small deadzone avoids tiny jumps when the card is already comfortably in view.
  const nudgeToCard = useCallback((id: string) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const card = vp.querySelector<HTMLElement>(`[data-testid="research-node-${id}"]`);
    if (!card) return;
    const vpRect = vp.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const targetTop = vpRect.height * 0.22;
    const deltaY = targetTop - (cardRect.top - vpRect.top);
    if (Math.abs(deltaY) < 8) return;
    setT((prev) => ({ ...prev, ty: prev.ty + deltaY }));
  }, []);

  // Scroll to the focused node (sidebar row, deep link, grown child, canvas card
  // click). The canvas quick-chat lights a fresh node WITHOUT opening its reading
  // overlay (it only sets `highlightedNodeId`), so we scroll to whichever is the
  // current focus — the open node, else the lit one. rAF lets a just-created card
  // lay out first.
  const scrollTarget = activeNodeId ?? highlightedNodeId;
  useEffect(() => {
    if (!scrollTarget) return;
    if (scrolledTo.current === scrollTarget) return;
    scrolledTo.current = scrollTarget;
    const raf = requestAnimationFrame(() => nudgeToCard(scrollTarget));
    return () => cancelAnimationFrame(raf);
  }, [scrollTarget, nudgeToCard]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Any press on the canvas counts as "clicking elsewhere" → drop the
      // sidebar-driven project highlight.
      clearProjectHighlight();
      // Only pan when the bare background is grabbed — never when starting on an
      // interactive element (a node card, the topic banner, or the outline
      // trace-debug entry), so their clicks aren't swallowed by a
      // pan/pointer-capture.
      if (
        (e.target as HTMLElement).closest(".rc-node, .rc-outline-banner, .rc-trace-open")
      )
        return;
      // Pressing blank canvas (not a card/banner) clears the node highlight —
      // closing the reading overlay keeps it, only a blank press or opening
      // another card moves/clears it.
      clearNodeHighlight();
      pan.current = { x: e.clientX, y: e.clientY, tx: t.tx, ty: t.ty };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [t.tx, t.ty, clearProjectHighlight, clearNodeHighlight],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pan.current) return;
    setT((prev) => ({
      ...prev,
      tx: pan.current!.tx + (e.clientX - pan.current!.x),
      ty: pan.current!.ty + (e.clientY - pan.current!.y),
    }));
  }, []);

  const endPan = useCallback(() => {
    pan.current = null;
  }, []);

  // Native (non-passive) wheel listener. We must NOT use React's onWheel here:
  // React registers wheel as a passive listener, so preventDefault() is ignored
  // and a horizontal trackpad swipe (deltaX) bubbles up to the browser as
  // back/forward navigation. A non-passive listener lets us preventDefault and
  // keep the gesture inside the canvas.
  const onWheel = useCallback((e: WheelEvent) => {
    const vp = viewportRef.current;
    if (!vp) return;
    e.preventDefault();
    const rect = vp.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // ctrl/meta (or pinch) → zoom around the cursor; otherwise pan.
    if (e.ctrlKey || e.metaKey) {
      setT((prev) => {
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
        const k = scale / prev.scale;
        return { scale, tx: cx - (cx - prev.tx) * k, ty: cy - (cy - prev.ty) * k };
      });
      return;
    }
    setT((prev) => ({ ...prev, tx: prev.tx - e.deltaX, ty: prev.ty - e.deltaY }));
  }, []);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  if (!root) return null;
  const rootLoading = root.status === "loading";
  // The lit card. Driven by `highlightedNodeId`, which (unlike `activeNodeId`)
  // survives closing the reading overlay — it only clears on a blank-canvas
  // press or moves when another node is opened.
  const highlightId = highlightedNodeId;

  return (
    <div
      ref={viewportRef}
      className="rc-viewport"
      data-testid="research-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerLeave={endPan}>
      <div
        className="rc-world"
        style={{ transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})` }}>
        <div className="rc-outline" style={{ width: OUTLINE_WIDTH }}>
          <button
            type="button"
            className={`rc-outline-banner${projectHighlighted ? " is-selected" : ""}`}
            onClick={() => openNode(root.id)}
            data-testid="research-banner"
            title={root.title}>
            <span className="rc-outline-banner-label">研究方向</span>
            <span className="rc-outline-banner-title">{root.title}</span>
          </button>

          {/* Debug entry: inspect how the AI generated this outline (left-side
              directory). Appears once the outline-generation trace exists. */}
          {outlineTrace && <ResearchTraceLauncher trace={outlineTrace} placement="outline" />}

          {/* While the outline is being generated the root has no children yet;
              show shimmering skeleton rows in the main content area so it reads
              as "loading here" (not an empty canvas), matching the sidebar's
              "大纲生成中…". Replaced by the real branches once they land. */}
          {rootLoading && (
            <div
              className="rc-skeleton"
              data-testid="research-outline-skeleton"
              aria-label="大纲生成中"
              aria-busy="true">
              {OUTLINE_SKELETON.map((row, i) => (
                <div className="rc-skel-card" key={i} style={{ marginLeft: row.indent }}>
                  <div className="rc-skel-line rc-skel-title" style={{ width: row.title }} />
                  <div className="rc-skel-line rc-skel-brief" style={{ width: row.brief }} />
                </div>
              ))}
            </div>
          )}

          <div className="rc-branches">
            {(childrenOf[root.id] ?? []).map((cid) => (
              <NodeBranch
                key={cid}
                id={cid}
                nodes={nodes}
                childrenOf={childrenOf}
                highlightId={highlightId}
                onOpen={openNode}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BranchProps {
  id: string;
  nodes: Record<string, ResearchNode>;
  childrenOf: Record<string, string[]>;
  /** The node to light up: the focused (being-scrolled-to) or active node. */
  highlightId: string | null;
  onOpen: (id: string) => void;
}

/** One outline node + its indented children, joined by a vertical rail. */
function NodeBranch({ id, nodes, childrenOf, highlightId, onOpen }: BranchProps) {
  const node = nodes[id];
  if (!node) return null;
  const kids = childrenOf[id] ?? [];
  return (
    <div className="rc-branch" data-depth={node.depth}>
      <ResearchNodeCard node={node} active={id === highlightId} onOpen={onOpen} />
      {kids.length > 0 && (
        <div className="rc-rail">
          <div className="rc-rail-line" aria-hidden="true" />
          <div className="rc-rail-children">
            {kids.map((cid) => (
              <NodeBranch
                key={cid}
                id={cid}
                nodes={nodes}
                childrenOf={childrenOf}
                highlightId={highlightId}
                onOpen={onOpen}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
