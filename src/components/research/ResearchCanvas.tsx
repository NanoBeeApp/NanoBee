// The infinite research canvas: a pan/zoom viewport rendering the node tree as
// absolutely-positioned cards plus an SVG edge layer (parent → child links).
//
// Interaction invariants ported from Curve:
//  - enters at a comfortable reading scale (not fit-all-to-one-screen),
//  - drag background to pan, wheel to zoom around the cursor.
// Transform lives in local state (perf); the node coordinates come from the
// store's tidy-tree layout.

import { useCallback, useEffect, useRef, useState } from "react";
import { useResearchStore } from "../../store/useResearchStore";
import { ResearchNodeCard } from "./ResearchNodeCard";
import { NODE_H, NODE_W } from "./layout";

interface Transform {
  tx: number;
  ty: number;
  scale: number;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 1.6;
const INITIAL_SCALE = 0.9;

export function ResearchCanvas() {
  const nodes = useResearchStore((s) => s.nodes);
  const order = useResearchStore((s) => s.order);
  const activeNodeId = useResearchStore((s) => s.activeNodeId);
  const openNode = useResearchStore((s) => s.openNode);

  const viewportRef = useRef<HTMLDivElement>(null);
  const [t, setT] = useState<Transform>({ tx: 0, ty: 0, scale: INITIAL_SCALE });
  const centeredFor = useRef<string>("");
  const pan = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Center content twice per project: once on the bare root ("seed") and once
  // when the full outline first lands ("tree"). Growing children afterwards
  // keeps the same "tree" key, so the view does not jump on every follow-up.
  useEffect(() => {
    const root = order[0];
    if (!root) return;
    const key = `${root}:${order.length <= 1 ? "seed" : "tree"}`;
    if (centeredFor.current === key) return;
    const vp = viewportRef.current;
    if (!vp) return;
    const xs = order.map((id) => nodes[id]?.x ?? 0);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs) + NODE_W;
    const contentW = (maxX - minX) * INITIAL_SCALE;
    const tx = (vp.clientWidth - contentW) / 2 - minX * INITIAL_SCALE;
    const ty = 48;
    centeredFor.current = key;
    setT({ tx, ty, scale: INITIAL_SCALE });
  }, [order, nodes]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only pan when the background (not a card) is grabbed.
      if ((e.target as HTMLElement).closest(".rc-node")) return;
      pan.current = { x: e.clientX, y: e.clientY, tx: t.tx, ty: t.ty };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [t.tx, t.ty],
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

  const onWheel = useCallback((e: React.WheelEvent) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    setT((prev) => {
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const k = scale / prev.scale;
      // Keep the point under the cursor fixed while zooming.
      return { scale, tx: cx - (cx - prev.tx) * k, ty: cy - (cy - prev.ty) * k };
    });
  }, []);

  const edges = order
    .map((id) => nodes[id])
    .filter((n) => n && n.parentId && nodes[n.parentId])
    .map((n) => {
      const p = nodes[n!.parentId!];
      return {
        id: n!.id,
        x1: p.x + NODE_W / 2,
        y1: p.y + NODE_H,
        x2: n!.x + NODE_W / 2,
        y2: n!.y,
      };
    });

  return (
    <div
      ref={viewportRef}
      className="rc-viewport"
      data-testid="research-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerLeave={endPan}
      onWheel={onWheel}>
      <div
        className="rc-world"
        style={{ transform: `translate(${t.tx}px, ${t.ty}px) scale(${t.scale})` }}>
        <svg className="rc-edges" aria-hidden="true">
          {edges.map((e) => (
            <path
              key={e.id}
              d={`M ${e.x1} ${e.y1} C ${e.x1} ${e.y1 + 48}, ${e.x2} ${e.y2 - 48}, ${e.x2} ${e.y2}`}
              fill="none"
            />
          ))}
        </svg>
        {order.map((id) => {
          const node = nodes[id];
          if (!node) return null;
          return (
            <ResearchNodeCard
              key={id}
              node={node}
              active={id === activeNodeId}
              onOpen={openNode}
            />
          );
        })}
      </div>
    </div>
  );
}
