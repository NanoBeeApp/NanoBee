# paras-to-markdown.ts

## Responsibility
Converts the legacy structured `Paragraph[]` representation of an AI message into
a plain markdown string, so chat rendering can flow through the shared
`<Markdown>` component (one render path everywhere).

## Core exports / API
- `parasToMarkdown(paras: Paragraph[]): string` — joins paragraphs with blank
  lines; per inline segment: plain string → as-is, `{ b }` → `**bold**`,
  `{ num }` → the number as plain text.

## Dependencies
- Upstream: `../types` (`Paragraph` / `InlineSegment`).
- Downstream: `chat/MessageView.tsx` (`m.md ?? parasToMarkdown(m.paras)`).

## Key implementation notes
- LLM-generated replies set `AiMessage.md` directly (raw markdown); this helper
  is the fallback for prototype/mock conversations authored as structured
  segments.
- Bold serializes to `**…**`; combined with `remark-cjk-friendly` in the Markdown
  component, CJK text hugging the emphasis markers (e.g. `结合 **「黄金」**：`)
  parses correctly.

## Change history

### 2026-06-13 — created
- **Motivation**: after unifying chat rendering through the shared `<Markdown>` component, AI messages in legacy mock conversations — written using `{ b }`/`{ num }` structured segments — also needed to be converted to markdown strings so they could feed the same renderer.
- **Goal**: provide a lossless `Paragraph[]` → markdown serialization, avoiding a second rendering path in chat.
- **Key decision**: chose to serialize the old structure rather than bulk-rewrite mock data, so `conversations.ts` stays unchanged and the helper works for any `Paragraph[]` (solves the problem class, not just the specific mock).
