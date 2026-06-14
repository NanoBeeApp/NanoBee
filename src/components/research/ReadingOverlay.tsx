// Reading panel for the active node: shows the generated article, makes bold
// terms clickable (deep-dive → grow a child), and renders the three follow-up
// questions as chips (click → grow a child along that question). Rendered as a
// centered modal (mirrors Curve's reading sheet) over a dimmed backdrop —
// clicking the backdrop closes it, clicking the sheet does not. White
// background, chrome minimized (floating close button, no header/footer bars).

import { useResearchStore } from "../../store/useResearchStore";
import { Icons } from "../../icons/icons";
import { Markdown } from "../common/Markdown";

export function ReadingOverlay() {
  const activeNodeId = useResearchStore((s) => s.activeNodeId);
  const node = useResearchStore((s) => (activeNodeId ? s.nodes[activeNodeId] : null));
  const closeReading = useResearchStore((s) => s.closeReading);
  const growChild = useResearchStore((s) => s.growChild);
  const openNode = useResearchStore((s) => s.openNode);

  if (!activeNodeId || !node) return null;

  const loading = node.status === "loading";
  const failed = node.status === "failed";
  const hasContent = Boolean(node.content);

  return (
    <div className="rc-reading-scrim" onClick={closeReading} data-testid="research-reading-scrim">
      <aside
        className="rc-reading"
        data-testid="research-reading-overlay"
        onClick={(e) => e.stopPropagation()}>
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

          {/* First token hasn't landed yet → spinner; once text starts
              streaming we show the body below instead. */}
          {loading && !hasContent && (
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

          {/* Render the article as soon as any text exists — partial while
              streaming, full once the `final` event lands. */}
          {!failed && hasContent && (
            <Markdown
              className="rc-prose"
              data-testid="research-article-body"
              content={node.content!}
              onTermClick={(term) => growChild(node.id, { focusTerm: term })}
            />
          )}

          {loading && hasContent && (
            <div
              className="rc-reading-streaming"
              data-testid="research-streaming"
              aria-live="polite">
              <span className="rc-stream-cursor" />
              正在生成…
            </div>
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
    </div>
  );
}
