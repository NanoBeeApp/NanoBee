# components/research/MarkdownLite.tsx

## File responsibility
Lightweight Markdown renderer for research article bodies; turns `**bold**`
spans into clickable deep-dive terms.

## Core exports / API
- `MarkdownLite({ content, onTermClick })`.

## Dependencies
- Upstream: React only (no markdown deps, per the lightweight-dependency rule).
- Downstream: `components/research/ReadingOverlay.tsx`.

## Key implementation notes
- Handles paragraphs, simple bullet lists, and bold→clickable terms. A clicked
  bold term calls `onTermClick(term)`, which the overlay maps to growing a child
  node (Curve's core deep-dive interaction).
- Not handled (acceptable for MVP): headings, tables, KaTeX, links.

## Change history

### 2026-06-13 — Created
- **Motivation**: Render generated articles and expose bold entities as
  research entry points without pulling in react-markdown / remark / rehype.
- **Goal**: ~60 lines covering the prose shapes the prompt actually produces.
- **Key decision**: Custom tiny renderer over a markdown library to respect
  NanoBee's lightweight-dependency rule.
