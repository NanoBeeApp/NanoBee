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
  - `streaming` — set while `content` is still streaming token by token. Each
    frame is pre-passed through `completeStreamingMarkdown` (temporarily closes
    open markers so the structure stays stable) and rehype-highlight is dropped
    (deferred to the final render). Omitted → normal one-shot render.
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
  math becomes the dollar form remark-math understands. In `streaming` mode the
  result is then passed through `completeStreamingMarkdown` so an incomplete
  frame's markers are balanced before parsing.
- The normalize/complete pipeline and the rendered `source` are memoized on
  `[content, streaming]` so re-renders that don't change the text are cheap.
- `streaming` selects `REHYPE_PLUGINS_STREAMING` (no rehype-highlight); the
  final render uses the full `REHYPE_PLUGINS` with highlighting restored.
- `.markdown-body` (in Markdown.css) is the single authority for every element's
  styling; chat (`.nb-body`) and research (`.rc-prose`) wrappers only set CSS
  custom properties (`--md-fs`/`--md-lh`/`--md-fg`/`--md-gap`) — no element rules
  — so there is exactly one owner per element and no cascade-order ambiguity.
- highlight.js github theme is light-only (NanoBee forbids dark themes); its
  `.hljs` background/padding is stripped so the `<pre>` container owns the surface.

## Change history

### 2026-06-14 — add streaming `streaming` mode
- **Motivation**: on the research reading page, typewriter-style streaming re-parsed the whole "incomplete markdown" on every token. Unclosed markers (`**`, fenced ```` ``` ````, headings `#`, `$$`) first rendered as raw text, then snapped into block/inline elements when the closing marker arrived, causing full re-layouts and visually jumpy typography.
- **Goal**: make every streaming frame's block/inline structure consistent with the final result (just shorter), eliminating the "text → element" structural jumps and re-layouts.
- **Key decisions**: (1) add the `streaming` prop — when set, pre-pass content through `completeStreamingMarkdown` to temporarily close open markers before parsing; (2) disable rehype-highlight during streaming (re-highlighting every token is both slow and causes color flicker); restore full highlighting on the final render; (3) memoize the normalize/complete pipeline and the rendered source via `useMemo`.

### 2026-06-13 — created
- **Motivation**: AI chat replies are LLM-generated markdown, but the old pipeline (`textToParas` + `InlineSegments`) only understood plain text, bold, and numbers — markdown syntax (headings, lists, code blocks, links, tables, math) was displayed as literal text. The user requested "render chat content as markdown, referencing the Curve project's implementation, and extract a shared component."
- **Goal**: extract Curve's react-markdown rendering pipeline into a shared component, consumed by both chat and the research reading view, for a unified markdown display.
- **Key decisions**: (1) rendering code ported 1:1 from Curve (plugin config, normalize-math, custom `a`/`img` renderers), but CSS rewritten with NanoBee design tokens — no Curve's hand-drawn/sketchpad theme; (2) the optional `onTermClick` prop folds the research reading "click bold text to deep-dive" interaction into the same component, avoiding two separate renderers; (3) this approach knowingly trades the lightweight-dependency principle, a trade-off the user explicitly accepted.
