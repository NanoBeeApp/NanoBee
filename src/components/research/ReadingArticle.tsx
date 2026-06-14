// The reading article body + two always-on interactions (ported from Curve's
// ReadingContent), adapted to NanoBee's shared <Markdown> renderer:
//
//  - Auto-terms: after the article renders, high-signal phrases (AI bold spans,
//    《...》, 「...」, the node's tags) are wrapped in clickable .rc-autoterm spans
//    via DOM decoration. Clicking one deep-dives (grows a child node) and sends
//    the clicked phrase + its enclosing paragraph as context.
//  - Selection bubble: selecting any text pops a "高亮 / 进一步研究" bubble; the
//    enclosing paragraph is captured at mouseup so it survives the selection
//    being cleared when a bubble button is pressed.
//
// React-safety: the <Markdown> element is memoized so this component re-rendering
// (selection / highlight state) never re-reconciles the markdown subtree, which
// would otherwise fight the manual DOM decorations. Decoration runs only on
// STABLE (non-streaming) content, and the parent keys this component by node id
// so switching nodes fully remounts it.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Markdown } from "../common/Markdown";
import {
  applyDecorations,
  extractAutoTermCandidates,
  findEnclosingParagraphText,
} from "./auto-term";
import { loadHighlights, saveHighlights } from "./reading-highlights";

interface ReadingArticleProps {
  content: string;
  nodeId: string;
  projectId: string | null;
  tags?: string[];
  /** True while content is still streaming in — decoration is deferred. */
  streaming: boolean;
  /** Deep-dive: grow a child around `term`, with the surrounding paragraph. */
  onDeepDive: (term: string, focusParagraph?: string) => void;
  onOpenImage: (src: string) => void;
}

interface SelectionBubble {
  text: string;
  top: number;
  left: number;
  focusParagraph?: string;
}

export function ReadingArticle({
  content,
  nodeId,
  projectId,
  tags,
  streaming,
  onDeepDive,
  onOpenImage,
}: ReadingArticleProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const [highlights, setHighlights] = useState<string[]>([]);
  useEffect(() => {
    setHighlights(loadHighlights(projectId, nodeId));
  }, [projectId, nodeId]);

  const candidates = useMemo(
    () => extractAutoTermCandidates(content, tags),
    [content, tags],
  );

  const [bubble, setBubble] = useState<SelectionBubble | null>(null);
  useEffect(() => {
    setBubble(null);
  }, [nodeId]);

  // Memoize the rendered markdown so selection / highlight re-renders don't
  // re-create it; React then leaves the decorated DOM untouched.
  const markdownEl = useMemo(
    () => (
      <Markdown
        className="rc-prose"
        data-testid="research-article-body"
        content={content}
        streaming={streaming}
        onOpenImage={onOpenImage}
      />
    ),
    [content, streaming, onOpenImage],
  );

  // Apply auto-term + highlight decorations once the content is stable. Skipped
  // while streaming (tokens still landing) — re-runs when content / highlights /
  // candidates change.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (streaming) return;
    applyDecorations(root, { candidates, highlights });
  }, [content, streaming, candidates, highlights]);

  // Container click delegation: an .rc-autoterm click deep-dives (unless the
  // user is mid-selection, in which case the bubble takes over).
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.toString().trim().length >= 2) return;
      const target = event.target as HTMLElement | null;
      const termEl = target?.closest<HTMLElement>(".rc-autoterm");
      if (!termEl) return;
      const term = (termEl.dataset.term ?? termEl.textContent ?? "").trim();
      if (!term) return;
      event.preventDefault();
      const root = rootRef.current;
      const focusParagraph = root
        ? findEnclosingParagraphText(termEl, root)
        : undefined;
      onDeepDive(term, focusParagraph);
    },
    [onDeepDive],
  );

  // Selection bubble: on mouseup, if a non-empty selection sits inside the
  // article, show the bubble and capture the enclosing paragraph now (before a
  // button press clears the selection).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const handleMouseUp = () => {
      window.setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
          setBubble(null);
          return;
        }
        const range = sel.getRangeAt(0);
        if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
          setBubble(null);
          return;
        }
        const text = sel.toString().trim();
        if (text.length < 2) {
          setBubble(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        const rootRect = root.getBoundingClientRect();
        const startNode =
          range.startContainer.nodeType === Node.ELEMENT_NODE
            ? (range.startContainer as HTMLElement)
            : range.startContainer.parentElement;
        const focusParagraph = startNode
          ? findEnclosingParagraphText(startNode, root)
          : undefined;
        setBubble({
          text,
          top: rect.top - rootRect.top - 8,
          left: rect.left - rootRect.left + rect.width / 2,
          focusParagraph,
        });
      }, 0);
    };

    const handleDocMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(".rc-selbubble")) return;
      setBubble(null);
    };

    root.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleDocMouseDown);
    return () => {
      root.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleDocMouseDown);
    };
  }, []);

  const handleHighlight = useCallback(() => {
    if (!bubble) return;
    setHighlights((prev) => {
      if (prev.includes(bubble.text)) return prev;
      const next = [...prev, bubble.text];
      saveHighlights(projectId, nodeId, next);
      return next;
    });
    setBubble(null);
    window.getSelection()?.removeAllRanges();
  }, [bubble, projectId, nodeId]);

  const handleResearchSelection = useCallback(() => {
    if (!bubble) return;
    onDeepDive(bubble.text, bubble.focusParagraph);
    setBubble(null);
    window.getSelection()?.removeAllRanges();
  }, [bubble, onDeepDive]);

  return (
    <div className="rc-article" ref={rootRef} onClick={handleClick}>
      {markdownEl}

      {bubble && (
        <div
          className="rc-selbubble"
          data-testid="research-selection-bubble"
          style={{
            position: "absolute",
            top: `${bubble.top}px`,
            left: `${bubble.left}px`,
            transform: "translate(-50%, -100%)",
          }}
          onMouseDown={(e) => e.preventDefault() /* keep the selection alive */}>
          <button
            type="button"
            className="rc-selbubble-btn"
            onClick={handleHighlight}
            data-testid="research-selection-highlight">
            <span aria-hidden="true">✦</span> 高亮
          </button>
          <span className="rc-selbubble-sep" aria-hidden="true" />
          <button
            type="button"
            className="rc-selbubble-btn rc-selbubble-primary"
            onClick={handleResearchSelection}
            data-testid="research-selection-research">
            <span aria-hidden="true">↳</span> 进一步研究
          </button>
        </div>
      )}
    </div>
  );
}
