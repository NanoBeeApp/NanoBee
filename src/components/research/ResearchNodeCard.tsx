// One knowledge node rendered as a card in the outline. Pure presentational
// component: it receives a node + handlers and renders title / brief / status.
// Layout is normal document flow — the parent canvas nests cards under a
// vertical rail; this card never positions itself.

import type { ResearchNode } from "../../research/types";

interface Props {
  node: ResearchNode;
  active: boolean;
  onOpen: (id: string) => void;
}

export function ResearchNodeCard({ node, active, onOpen }: Props) {
  const loading = node.status === "loading";
  const failed = node.status === "failed";
  return (
    <button
      type="button"
      className={`rc-node depth-${Math.min(node.depth, 3)}${node.isRoot ? " is-root" : ""}${
        active ? " is-active" : ""
      }${failed ? " is-failed" : ""}`}
      onClick={() => onOpen(node.id)}
      data-testid={`research-node-${node.id}`}
      title={node.title}>
      {(node.isRoot || loading) && (
        <div className="rc-node-head">
          {node.isRoot && <span className="rc-node-kind">研究方向</span>}
          {loading && <span className="rc-node-spinner" aria-label="生成中" />}
        </div>
      )}
      <div className="rc-node-title">{node.title}</div>
      {node.brief && <div className="rc-node-brief">{node.brief}</div>}
      {failed && <div className="rc-node-failed">生成失败 · 点击重试</div>}
    </button>
  );
}
