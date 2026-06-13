// Lightweight Markdown renderer for research article bodies. Deliberately tiny
// (no react-markdown / remark deps, per NanoBee's lightweight-dependency rule):
// it handles paragraphs, simple bullet lists, and — crucially — turns
// `**bold**` spans into clickable "deep-dive" terms, which is a core Curve
// interaction (click a bold entity to grow a child node around it).
//
// Not handled (acceptable for the MVP): headings, tables, KaTeX math, links.
// The generation prompt asks for narrative prose, so bodies are mostly
// paragraphs with bold entities.

import type { ReactNode } from "react";

interface Props {
  content: string;
  /** Called with the clicked bold term's plain text. */
  onTermClick: (term: string) => void;
}

const BOLD_RE = /\*\*(.+?)\*\*/g;

/** Split one line of text into plain runs and clickable bold terms. */
function renderInline(
  text: string,
  onTermClick: (term: string) => void,
  keyBase: string,
): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  BOLD_RE.lastIndex = 0;
  let i = 0;
  while ((m = BOLD_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const term = m[1];
    out.push(
      <button
        key={`${keyBase}-t${i}`}
        type="button"
        className="rc-term"
        onClick={() => onTermClick(term)}
        data-testid="research-term"
        title="点击深入研究">
        {term}
      </button>,
    );
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function MarkdownLite({ content, onTermClick }: Props) {
  const blocks = content
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="rc-prose" data-testid="research-article-body">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim());
        const isList = lines.every((l) => /^[-*]\s+/.test(l));
        if (isList) {
          return (
            <ul key={`b${bi}`}>
              {lines.map((l, li) => (
                <li key={`b${bi}-l${li}`}>
                  {renderInline(l.replace(/^[-*]\s+/, ""), onTermClick, `b${bi}-l${li}`)}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={`b${bi}`}>{renderInline(block, onTermClick, `b${bi}`)}</p>;
      })}
    </div>
  );
}
