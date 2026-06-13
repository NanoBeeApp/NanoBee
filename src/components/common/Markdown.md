# Markdown.tsx

## Responsibility
The single shared Markdown renderer for the whole app — chat replies, proactive
push cards, and research reading all funnel through it. The react-markdown +
remark/rehype plugin stack mirrors the Curve project (windseed-curve) so output
is consistent across surfaces: GFM (tables, strikethrough, task lists), KaTeX
math, highlight.js code blocks, gemoji shortcodes, CJK-friendly line breaks.

## Core exports / API
- `Markdown({ content, onTermClick?, onOpenImage?, className?, "data-testid"?, "data-ai-text"? })`
  - `content` — raw markdown string (the only required prop).
  - `onTermClick(term)` — when provided, `**bold**` spans render as clickable
    `.rc-term` deep-dive buttons (research canvas grows a child node). Omitted →
    plain `<strong>` (chat).
  - `onOpenImage(src)` — when provided, images render as `.md-img-btn` buttons
    that open a zoom/lightbox. Omitted → plain lazy `<img>`.
  - `className` — merged onto the `.markdown-body` root (e.g. `nb-body`,
    `rc-prose`, `nb-selectable`).
  - `data-testid` / `data-ai-text` — forwarded to the root so callers keep their
    selection-toolbar (`data-ai-text`) and e2e hooks.

## Dependencies
- Upstream packages: react-markdown, remark-cjk-friendly, remark-gfm,
  remark-math, remark-gemoji, rehype-slug, rehype-highlight, rehype-katex,
  highlight.js (github theme CSS), katex (CSS). Plus `./normalize-math` and
  `../../lib/utils#cn`.
- Stylesheet: `./Markdown.css` (`.markdown-body`, NanoBee design tokens) imported
  as a side effect, alongside `katex/dist/katex.min.css` and
  `highlight.js/styles/github.css`.
- Downstream: `chat/MessageView.tsx`, `research/ReadingOverlay.tsx`.

## Key implementation notes
- Plugin arrays are module-level constants (stable identity → react-markdown does
  not re-run the pipeline every render).
- `content` is run through `normalizeMathDelimiters` first so `\( … \)` / `\[ … \]`
  math becomes the dollar form remark-math understands.
- `.markdown-body` (in Markdown.css) is the single authority for every element's
  styling; chat (`.nb-body`) and research (`.rc-prose`) wrappers only set CSS
  custom properties (`--md-fs`/`--md-lh`/`--md-fg`/`--md-gap`) — no element rules
  — so there is exactly one owner per element and no cascade-order ambiguity.
- highlight.js github theme is light-only (NanoBee forbids dark themes); its
  `.hljs` background/padding is stripped so the `<pre>` container owns the surface.

## 变更历史

### 2026-06-13 — 创建
- **出发点**：聊天 AI 回复其实是 LLM 输出的 markdown 文本，但旧链路（textToParas +
  InlineSegments）只认纯文本/加粗/数字，markdown 语法（标题、列表、代码块、链接、
  表格、公式）全被当字面量显示。用户要求「聊天内容显示参考 curve 的代码显示
  markdown，提取公共组件」。
- **目标**：把 curve 的 react-markdown 渲染链路抽成一个公共组件，聊天与研究阅读共用，
  统一 markdown 显示效果。
- **关键决策**：(1) 渲染代码 1:1 照搬 curve（插件配置、normalize-math、自定义
  a/img），但 CSS 用 NanoBee 设计变量重写，不带 curve 的手绘草图主题；(2) 用可选
  `onTermClick` 把研究阅读「加粗即可点深入」的交互并入同一组件，避免两套渲染器；
  (3) 该方案在已知违反「轻量依赖铁律」的前提下经用户明确选择。
