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

## 变更历史

### 2026-06-13 — 创建
- **出发点**：把聊天显示统一到公共 `<Markdown>` 组件后，需要把历史 mock 会话里用
  `{ b }`/`{ num }` 结构化片段写的 AI 消息也转成 markdown 字符串喂给同一渲染器。
- **目标**：提供一个无损的 Paragraph[] → markdown 序列化，避免聊天保留第二套渲染路径。
- **关键决策**：选择「序列化旧结构」而非「批量改写 mock 数据」，这样
  conversations.ts 保持不变，且对任意 Paragraph[] 通用（解决一类问题）。
