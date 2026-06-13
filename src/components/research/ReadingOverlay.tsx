// Reading panel for the active node: shows the generated article, makes bold
// terms clickable (deep-dive → grow a child), and renders the three follow-up
// questions as chips (click → grow a child along that question). Right-docked
// so the canvas stays visible behind it; white background, chrome minimized
// (floating close button, no header/footer bars) per NanoBee's UI rules.

import { useResearchStore } from "../../store/useResearchStore";
import { Icons } from "../../icons/icons";
import { MarkdownLite } from "./MarkdownLite";

export function ReadingOverlay() {
  const activeNodeId = useResearchStore((s) => s.activeNodeId);
  const node = useResearchStore((s) => (activeNodeId ? s.nodes[activeNodeId] : null));
  const closeReading = useResearchStore((s) => s.closeReading);
  const growChild = useResearchStore((s) => s.growChild);
  const openNode = useResearchStore((s) => s.openNode);

  if (!activeNodeId || !node) return null;

  const loading = node.status === "loading";
  const failed = node.status === "failed";

  return (
    <>
      <div className="rc-reading-scrim" onClick={closeReading} data-testid="research-reading-scrim" />
      <aside className="rc-reading" data-testid="research-reading-overlay">
        <button
          className="rc-reading-close"
          onClick={closeReading}
          title="关闭"
          data-testid="research-reading-close">
          <Icons.x size={18} />
        </button>

        <div className="rc-reading-scroll">
          {node.tags && node.tags.length > 0 && (
            <div className="rc-reading-tags">
              {node.tags.map((tag) => (
                <span key={tag} className="rc-tag">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h1 className="rc-reading-title">{node.title}</h1>

          {loading && (
            <div className="rc-reading-loading" data-testid="research-reading-loading">
              <span className="rc-node-spinner" />
              AI 正在生成内容…
            </div>
          )}

          {failed && (
            <div className="rc-reading-failed">
              <p>内容生成失败。</p>
              <button className="rc-chip" onClick={() => openNode(node.id)}>
                <Icons.redo size={14} /> 重试
              </button>
            </div>
          )}

          {!loading && !failed && node.content && (
            <MarkdownLite
              content={node.content}
              onTermClick={(term) => growChild(node.id, { focusTerm: term })}
            />
          )}

          {!loading && !failed && node.isRoot && !node.content && (
            <p className="rc-reading-roothint">
              这是你的研究方向。点击画布上的任意节点开始深入阅读，或从下面的问题继续探索。
            </p>
          )}

          {!loading && node.questions && node.questions.length > 0 && (
            <div className="rc-followups" data-testid="research-followups">
              <div className="rc-followups-label">继续探索</div>
              {node.questions.map((q, i) => (
                <button
                  key={i}
                  className="rc-followup"
                  onClick={() => growChild(node.id, { question: q })}
                  data-testid={`research-followup-${i}`}>
                  <Icons.arrowRight size={15} />
                  <span>{q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
