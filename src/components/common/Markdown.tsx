// Shared Markdown renderer for the whole app (chat replies, proactive cards,
// research reading). The react-markdown + remark/rehype plugin stack mirrors the
// Curve project (windseed-curve) 1:1 so output is consistent: GFM tables/lists,
// KaTeX math, highlight.js code blocks, gemoji shortcodes, CJK-friendly line
// breaks. Visual styling lives in Markdown.css using NanoBee design tokens (not
// Curve's sketch theme).
//
// Two optional interactions keep this one component reusable everywhere:
//  - onTermClick: when provided, **bold** spans become clickable "deep-dive"
//    terms (research canvas grows a child node around the clicked entity). When
//    omitted, bold renders as a plain <strong> (chat).
//  - onOpenImage: when provided, images become buttons that open a zoom/lightbox.
import type { ReactNode } from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkGemoji from "remark-gemoji";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import { cn } from "../../lib/utils";
import { normalizeMathDelimiters } from "./normalize-math";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github.css";
import "./Markdown.css";

// Plugin lists are module-level constants so their identity is stable across
// renders (react-markdown re-runs the pipeline when these change).
const REMARK_PLUGINS: Options["remarkPlugins"] = [
  remarkCjkFriendly,
  [remarkGfm, { singleTilde: false }],
  [remarkMath, { singleDollarTextMath: true }],
  remarkGemoji,
];

const REHYPE_PLUGINS: Options["rehypePlugins"] = [
  rehypeSlug,
  [rehypeHighlight, { detect: true, ignoreMissing: true }],
  [
    rehypeKatex,
    { strict: false, throwOnError: false, errorColor: "var(--ink-3)" },
  ],
];

/** Flatten a markdown node's children down to plain text (for deep-dive terms). */
function nodeText(children: ReactNode): string {
  if (children == null || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) return children.map(nodeText).join("");
  if (typeof children === "object" && "props" in children) {
    return nodeText(
      (children as { props?: { children?: ReactNode } }).props?.children,
    );
  }
  return "";
}

interface MarkdownProps {
  /** Raw markdown source. */
  content: string;
  /**
   * When set, bold spans render as clickable deep-dive terms (research canvas).
   * Receives the bold span's plain text.
   */
  onTermClick?: (term: string) => void;
  /** When set, images render as buttons that open the given src (zoom). */
  onOpenImage?: (src: string) => void;
  /** Extra classes merged onto the `.markdown-body` root (e.g. chat body styles). */
  className?: string;
  /** Forwarded to the root so callers can attach data-* hooks (selection, e2e). */
  "data-testid"?: string;
  "data-ai-text"?: string;
}

export function Markdown({
  content,
  onTermClick,
  onOpenImage,
  className,
  "data-testid": dataTestid,
  "data-ai-text": dataAiText,
}: MarkdownProps) {
  const components: Components = {
    a: ({ node, ...props }) => {
      void node; // strip the hast node so it is not spread onto the DOM element
      return <a {...props} target="_blank" rel="noreferrer noopener" />;
    },
    strong: ({ node, children, ...props }) => {
      void node;
      if (!onTermClick) return <strong {...props}>{children}</strong>;
      const term = nodeText(children).trim();
      if (!term) return <strong {...props}>{children}</strong>;
      return (
        <button
          type="button"
          className="rc-term"
          onClick={() => onTermClick(term)}
          data-testid="research-term"
          title="点击深入研究">
          {children}
        </button>
      );
    },
    img: ({ node, src, alt, ...props }) => {
      void node;
      if (!src || typeof src !== "string") return null;
      if (!onOpenImage) {
        return <img src={src} alt={alt ?? ""} {...props} loading="lazy" />;
      }
      return (
        <button
          type="button"
          className="md-img-btn"
          onClick={() => onOpenImage(src)}
          title="点击放大">
          <img src={src} alt={alt ?? ""} {...props} loading="lazy" />
        </button>
      );
    },
  };

  return (
    <div
      className={cn("markdown-body", className)}
      data-testid={dataTestid}
      data-ai-text={dataAiText}>
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}>
        {normalizeMathDelimiters(content)}
      </ReactMarkdown>
    </div>
  );
}
