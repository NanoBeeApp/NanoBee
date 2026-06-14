# components/research/auto-term.ts

## File responsibility
Auto-term extraction + in-body DOM decoration for the reading article. Pulls
high-signal phrases out of article markdown and wraps their occurrences (and the
reader's saved highlights) in clickable `.rc-autoterm` spans / `<mark>` elements.
Ported from Curve's `reading-interactions.ts` + `auto-term-decoration.ts`.

## Core exports / API
- `extractAutoTermCandidates(content, tags?): string[]` — AI bold spans, 《...》,
  「...」, and tags, longest-first.
- `applyDecorations(root, { candidates, highlights? })` — strip old decorations,
  then re-apply highlights then auto-terms.
- `cleanupDecorations(root)` — unwrap all decorations back to plain text.
- `findEnclosingParagraphText(startEl, root)` — nearest block paragraph text
  (for the deep-dive `focusParagraph`).

## Dependencies
- Upstream: none (pure DOM/string util).
- Downstream: `components/research/ReadingArticle.tsx`.

## Key implementation notes
- Decoration mutates the rendered DOM directly, so the caller MUST keep the
  `<Markdown>` element referentially stable (memoized) and only decorate
  non-streaming content — otherwise React reconciliation fights the wrappers.
- `SKIP_ANCESTOR_SELECTOR` avoids re-wrapping links/code/math and already-
  decorated nodes; matches are wrapped longest-first so a short phrase can't eat
  a substring of a longer one.

## Change history

### 2026-06-14 — Created (Phase B port)
- **Motivation**: NanoBee only made literal `**bold**` clickable; Curve also
  surfaced 《...》/「...」/tags and supported reader highlights.
- **Goal**: broaden clickable deep-dive anchors and back highlight persistence.
- **Key decision**: adapt Curve's text-node splitting to NanoBee's single-string
  `node.content`; drop the streaming-preview preserve path (NanoBee defers all
  decoration until content is stable).
