// Reading panel for the active node: shows the generated article, makes bold
// terms clickable (deep-dive → grow a child), and renders the three follow-up
// questions as chips. Rendered as a centered modal (mirrors Curve's reading
// sheet) over a dimmed backdrop — clicking the backdrop closes it, clicking the
// sheet does not. White background, chrome minimized (floating close button, no
// header/footer bars).
//
// Ported reading-flow behaviors from Curve: a back-to-parent button, per-node
// scroll-position memory, an intro/takeaway summary that flips position
// depending on whether this visit watched the article generate, a streaming
// bottom buffer, an awaiting-body pending state, and an image lightbox.

import { useEffect, useRef, useState } from "react";
import { useResearchStore } from "../../store/useResearchStore";
import { Icons } from "../../icons/icons";
import { ReadingArticle } from "./ReadingArticle";
import { ResearchTraceLauncher } from "./ResearchTraceLauncher";
import { ReadingQnaTurns } from "./ReadingQnaTurns";
import { ImageLightbox } from "./ImageLightbox";
import { loadReadingProgress, saveReadingProgress } from "./reading-progress";

export function ReadingOverlay() {
  const activeNodeId = useResearchStore((s) => s.activeNodeId);
  const node = useResearchStore((s) => (activeNodeId ? s.nodes[activeNodeId] : null));
  const parentNode = useResearchStore((s) =>
    node?.parentId ? s.nodes[node.parentId] : null,
  );
  const projectId = useResearchStore((s) => s.projectId);
  // Article-generation trace for the open node (debug entry). Keyed by node id.
  const nodeTrace = useResearchStore((s) =>
    s.activeNodeId ? s.traces[s.activeNodeId] : undefined,
  );
  const closeReading = useResearchStore((s) => s.closeReading);
  const growChild = useResearchStore((s) => s.growChild);
  const openNode = useResearchStore((s) => s.openNode);
  const askInReading = useResearchStore((s) => s.askInReading);

  // Compact signature of the latest Q&A turn — changes id→status→answer length as
  // it streams, so the auto-scroll effect can follow a live answer to the bottom.
  const latestTurnSig = useResearchStore((s) => {
    const n = s.activeNodeId ? s.nodes[s.activeNodeId] : null;
    const turns = n?.userQuestionTurns;
    const t = turns && turns.length ? turns[turns.length - 1] : null;
    return t ? `${t.id}:${t.status}:${t.answer.length}` : "";
  });

  // The scrolling element — used for per-node scroll-position memory.
  const scrollRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");

  // Restore the saved scroll position when a node opens. rAF waits a frame so
  // the markdown has laid out and scrollHeight is tall enough not to clamp us
  // back to 0. Re-runs per node id.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeNodeId) return;
    const saved = loadReadingProgress(projectId, activeNodeId);
    const raf = requestAnimationFrame(() => {
      el.scrollTop = saved;
    });
    return () => cancelAnimationFrame(raf);
  }, [activeNodeId, projectId]);

  // Persist scroll position (debounced) as the reader scrolls.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !activeNodeId) return;
    const onScroll = () => {
      const top = el.scrollTop;
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        saveReadingProgress(projectId, activeNodeId, top);
      }, 250);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
    };
  }, [activeNodeId, projectId]);

  // Close the lightbox and clear the custom-question draft when the node changes.
  useEffect(() => {
    setLightboxSrc(null);
    setCustomQuestion("");
  }, [activeNodeId]);

  // Follow a live Q&A answer to the bottom as it streams in, so the reader sees
  // the new turn appear and grow without scrolling. Fires whenever the latest
  // turn's signature changes (new turn added or tokens landing).
  useEffect(() => {
    if (!latestTurnSig) return;
    const el = scrollRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [latestTurnSig]);

  // Summary-position strategy needs to know whether THIS visit started while the
  // article was still generating. Tracked with React's "adjust state during
  // render" pattern, re-evaluated whenever the open node changes, so switching
  // to a freshly-grown child immediately flips the summary to the bottom.
  const [trackedNodeId, setTrackedNodeId] = useState<string | null>(null);
  const [openedAsLoading, setOpenedAsLoading] = useState(false);

  if (!activeNodeId || !node) return null;

  const loading = node.status === "loading";
  const failed = node.status === "failed";
  const hasContent = Boolean(node.content);
  // Outline stub opened but its article never got filled in (not loading / not
  // failed, still flagged needsContent with no body).
  const isAwaitingBody =
    !loading && !failed && !node.isRoot && Boolean(node.needsContent) && !hasContent;
  const hasGeneratedBody = !loading && !failed && !isAwaitingBody && hasContent;

  if (trackedNodeId !== activeNodeId) {
    setTrackedNodeId(activeNodeId);
    setOpenedAsLoading(loading || isAwaitingBody);
  }

  // Card summary: once the body exists prefer the AI-written `summary` (a recap
  // of the real article); before that fall back to `brief` (the outline blurb).
  const displaySummary = hasGeneratedBody
    ? node.summary || node.brief
    : node.brief || node.summary;

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
          <Icons.x size={15} />
        </button>

        <div className="rc-reading-scroll" ref={scrollRef}>
          {/* Debug entry: inspect how the AI generated this article. Flows above
              the title (and back button) so it never overlaps the heading.
              Shown once a trace exists. */}
          {nodeTrace && <ResearchTraceLauncher trace={nodeTrace} placement="content" />}

          {/* Back to the parent node: only when this node has a parent. Lets the
              reader pop up one level (after deep-diving a term) without closing.
              Flows above the title so it never overlaps it. */}
          {parentNode && (
            <button
              className="rc-reading-back"
              onClick={() => openNode(parentNode.id)}
              title={`返回上级：${parentNode.title}`}
              data-testid="research-reading-back">
              <span className="rc-reading-back-icon">
                <Icons.chevR size={15} />
              </span>
              <span className="rc-reading-back-label">{parentNode.title}</span>
            </button>
          )}

          <h1 className="rc-reading-title">{node.title}</h1>

          {/* Revisit intro: the reader already watched this generate before, so
              the summary sits under the title as a quick opening recap. (On the
              first visit it appears at the bottom as a takeaway instead.) */}
          {!openedAsLoading && displaySummary && (
            <p className="rc-reading-summary" data-testid="research-reading-summary">
              {displaySummary}
            </p>
          )}

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

          {/* Outline stub whose body was never filled — offer to generate it. */}
          {isAwaitingBody && (
            <div className="rc-reading-pending" data-testid="research-reading-pending">
              <p>这个节点还没有正文。</p>
              <button className="rc-chip" onClick={() => openNode(node.id)}>
                <Icons.arrowRight size={14} /> 生成正文
              </button>
            </div>
          )}

          {/* Render the article as soon as any text exists — partial while
              streaming, full once the `final` event lands. Keyed by node id so
              switching nodes fully remounts the decorated body (avoids React
              reconciling the manually-decorated DOM across nodes). Auto-terms,
              the selection bubble, highlights and image lightbox live inside. */}
          {!failed && hasContent && (
            <ReadingArticle
              key={node.id}
              content={node.content!}
              nodeId={node.id}
              projectId={projectId}
              tags={node.tags}
              streaming={loading}
              onDeepDive={(term, focusParagraph) =>
                growChild(node.id, { focusTerm: term, focusParagraph })
              }
              onOpenImage={setLightboxSrc}
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

          {/* Streaming bottom buffer (ported from Curve): while the article is
              still streaming, append ~one screen of blank space below the body.
              Once the user scrolls down, the latest line settles near the top of
              the viewport and freshly generated tokens fill the blank below, so
              they can keep watching the article grow without re-scrolling every
              few lines. Rendered only while streaming; paired with
              `overflow-anchor: none` on the scroll container so appending text
              never auto-nudges scrollTop. No skeleton bars here — a plain buffer
              avoids a "gray-bars + prose" double track next to the live body. */}
          {loading && hasContent && (
            <div
              className="rc-stream-spacer"
              aria-hidden="true"
              data-testid="research-stream-spacer"
            />
          )}

          {/* First-visit takeaway: when this visit watched the article generate,
              the summary lands at the end as a closing recap that flows into the
              follow-ups, instead of interrupting the just-finished read up top. */}
          {hasGeneratedBody && openedAsLoading && displaySummary && (
            <div className="rc-reading-takeaway" data-testid="research-reading-takeaway">
              <div className="rc-followups-label">本篇摘要</div>
              <p className="rc-reading-summary">{displaySummary}</p>
            </div>
          )}

          {/* The reader's own custom follow-ups, answered inline (chat-style)
              right below the article they were asked about. */}
          {node.userQuestionTurns && node.userQuestionTurns.length > 0 && (
            <ReadingQnaTurns turns={node.userQuestionTurns} />
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

          {/* Custom follow-up: appears once the article exists. AI's preset
              questions grow child nodes; the reader's own question is answered
              inline above (appended to userQuestionTurns), not as a new node. */}
          {hasGeneratedBody && (
            <form
              className="rc-ask"
              data-testid="research-custom-question-form"
              onSubmit={(e) => {
                e.preventDefault();
                const q = customQuestion.trim();
                if (!q) return;
                void askInReading(node.id, q);
                setCustomQuestion("");
              }}>
              <input
                type="text"
                className="rc-ask-input"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value)}
                placeholder="还想问点别的？写下你自己的问题…"
                aria-label="自定义追问"
                maxLength={200}
                data-testid="research-custom-question-input"
              />
              <button
                type="submit"
                className="rc-ask-btn"
                disabled={!customQuestion.trim()}
                data-testid="research-custom-question-btn">
                问 AI
              </button>
            </form>
          )}
        </div>
      </aside>

      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
    </div>
  );
}
