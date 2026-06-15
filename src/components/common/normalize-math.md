# normalize-math.ts

## Responsibility
Normalises AI-emitted math delimiters before they reach `remark-math`. Converts
TeX-style `\( … \)` (inline) and `\[ … \]` (block) into the dollar forms
(`$ … $` / `$$ … $$`) that remark-math v6 actually parses, and promotes inline
`$$ … $$` into standalone display blocks. It also escapes currency dollar signs
(`$` immediately before a digit) to a literal `\$` so money amounts are not
misread as inline math. Fenced code blocks and inline code are left untouched so
example code is never corrupted.

## Core exports / API
- `normalizeMathDelimiters(input: string): string` — pure string transform, safe
  on empty input.

## Dependencies
- Upstream: none (pure function, no imports).
- Downstream: `Markdown.tsx` calls it on every markdown string before handing the
  content to `ReactMarkdown` + `remark-math` + `rehype-katex`.

## Key implementation notes
- Two-pass split: first isolate fenced blocks (```` ``` ````/`~~~`), then within
  each non-fence fragment a single regex matches inline code OR the three math
  delimiter forms, returning inline code verbatim.
- Ported 1:1 (logic) from the Curve project's `core/markdown/normalize-math.ts`;
  comments rewritten in English per the public-repo language rule.

## Change history

### 2026-06-13 — created
- **Motivation**: the user asked to reference the Curve project's code for markdown rendering in chat and the reading view; Curve's react-markdown pipeline depends on this pre-processing step to display math formulas correctly.
- **Goal**: bring Curve's math-delimiter normalization logic into NanoBee for reuse by the shared `Markdown` component.
- **Key decision**: co-located with the `Markdown` component in `components/common/` rather than creating a new top-level `src/core/` directory, keeping all markdown-rendering code in one place.

### 2026-06-15 — escape currency `$` so money is not rendered as a formula
- **Motivation**: production chat answers containing dollar amounts (e.g.
  "$138.15 美元 …（…为 $4,296.94 美元）") rendered the text *between* the two `$`
  as a KaTeX formula, turning the `**` bold markers into `∗∗`. With
  `singleDollarTextMath: true`, remark-math pairs the two currency `$` into
  inline math.
- **Goal**: show currency literally while keeping real inline math working.
- **Key decision**: a second pass escapes a `$` that sits immediately before a
  digit (`$138`) to `\$`. Real formulas start with a non-digit (`$x^2$`) and are
  untouched; `$$` display math, already-escaped `\$`, and inline code are
  excluded via a lookbehind / code-skipping. Verified with a tsx harness over
  five cases (currency pair, real formula, inline code, display math, TeX
  delimiters).
