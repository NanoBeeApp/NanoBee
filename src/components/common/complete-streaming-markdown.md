# complete-streaming-markdown.ts

## Responsibility
Stabilizes a partial Markdown string while it is still streaming token by token,
so each rendered frame has the same block/inline structure as the final output
and the layout stops "jumping around". Display-only helper used by the shared
`<Markdown>` renderer in its `streaming` mode.

## Core exports / API
- `completeStreamingMarkdown(input: string): string` — returns a structurally
  stable version of a possibly-incomplete Markdown string. It temporarily closes
  markers the stream has opened but not yet closed. Safe on complete Markdown
  (balanced input is returned unchanged).

What it balances / hides:
- Unclosed fenced code block (```` ``` ```` / `~~~`) → closes it (biggest
  reflow source: an open fence otherwise renders the rest of the article as one
  code block).
- Unclosed inline code (`` ` ``), bold (`**`/`__`), strikethrough (`~~`),
  display math (`$$`), italic (`*`/`_`) → appends the matching closer.
- A trailing line that is only a block-marker prefix (`##`, `- `, `>`, `1.`)
  → hidden until its content arrives.
- An inline link/image whose `)` has not streamed yet (`[label](url-so-far`)
  → hidden until complete.

Intentionally NOT handled:
- A lone inline `$` is left alone (usually a currency sign in prose; closing it
  would render a bogus KaTeX formula).

## Dependencies
- Upstream: none (pure string function, no imports).
- Downstream: `components/common/Markdown.tsx` (calls it when `streaming` is set).

## Key implementation notes
- The fenced-code check runs first and short-circuits: inside a code block all
  other markers are literal, so once an open fence is closed nothing else needs
  balancing.
- Inline parity counts run on a scratch copy with closed code spans and
  list/quote line prefixes stripped, so a `* ` bullet or `` `code` `` content
  does not skew the `*` / `` ` `` counts.
- Double-char markers are counted and stripped before single-char ones so `**`
  is not mistaken for two `*` (and `***word` closes as `***word***`).

## Change history

### 2026-06-14 — Created
- **Motivation**: the research reading overlay streams the article into
  `<Markdown>` one token at a time; each frame re-parsed incomplete Markdown, so
  unclosed markers (`**`, fenced ```` ``` ````, headings, `$$`) rendered as raw
  text and then snapped into styled elements the instant their closer arrived,
  reflowing the whole document — the visible "typesetting jumps while streaming".
- **Goal**: make every streamed frame structurally identical to the final
  output (only shorter), eliminating the snap/reflow without changing the
  authoritative content.
- **Key decision**: a small dependency-free string pre-pass (the project's
  lightweight-over-libraries rule) instead of pulling in a streaming-markdown
  library; balance only low-risk, high-reflow markers and deliberately skip a
  lone `$` to avoid currency-vs-formula false positives.
