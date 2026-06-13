// Serialize the app's legacy structured AI paragraphs (Paragraph[]) into a
// markdown string, so every chat surface can render through the shared
// <Markdown> component instead of the old InlineSegments path.
//
// AI replies coming from the LLM already carry raw markdown (AiMessage.md);
// this helper covers the prototype/mock conversations that were authored as
// structured segments ({ b } bold, { num } tabular number).
import type { Paragraph } from "../types";

/** Render a single inline segment to its markdown equivalent. */
function segmentToMarkdown(seg: Paragraph[number]): string {
  if (typeof seg === "string") return seg;
  if ("b" in seg) return `**${seg.b}**`;
  // { num } was a tabular-number span — plain text reads fine in prose.
  return seg.num;
}

/** Join structured paragraphs into a blank-line-separated markdown document. */
export function parasToMarkdown(paras: Paragraph[]): string {
  return paras
    .map((p) => p.map(segmentToMarkdown).join(""))
    .join("\n\n");
}
