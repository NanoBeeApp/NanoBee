# components/research/ReadingOverlay.tsx

## File responsibility
Right-docked reading panel for the active node: renders the article (with
clickable bold terms) and the three follow-up questions as chips.

## Core exports / API
- `ReadingOverlay()` — reads the active node from the store; null when none.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `icons/icons.tsx`, `MarkdownLite.tsx`.
- Downstream: `components/research/ResearchView.tsx`.

## Key implementation notes
- Bold terms → `growChild({ focusTerm })` (deep dive); follow-up chips →
  `growChild({ question })`. Both grow a child node and focus it.
- White background, chrome minimized (floating close button, no header/footer
  bars), canvas visible behind a scrim — per NanoBee's UI rules.
- Shows loading / failed / root-hint states.

## Change history

### 2026-06-13 — Created
- **Motivation**: Curve's reading overlay is the product's face (flow reading +
  three follow-ups + bold deep-dive); reproduce it in NanoBee's style.
- **Goal**: One panel that closes the read → follow-up → grow loop.
- **Key decision**: Right-docked panel over a full-screen modal so the growing
  canvas stays visible behind it.
