# components/research/ReadingOverlay.tsx

## File responsibility
Centered modal reading panel for the active node: renders the article (with
clickable bold terms) and the three follow-up questions as chips, over a dimmed
backdrop.

## Core exports / API
- `ReadingOverlay()` — reads the active node from the store; null when none.

## Dependencies
- Upstream: `store/useResearchStore.ts`, `icons/icons.tsx`, `MarkdownLite.tsx`.
- Downstream: `components/research/ResearchView.tsx`.

## Key implementation notes
- Bold terms → `growChild({ focusTerm })` (deep dive); follow-up chips →
  `growChild({ question })`. Both grow a child node and focus it.
- Structure: a `.rc-reading-scrim` backdrop flex-centers the `.rc-reading` sheet;
  clicking the backdrop closes, clicking the sheet `stopPropagation`s. White
  background, chrome minimized (floating close button, no header/footer bars).
- Shows loading / failed / root-hint states.

## Change history

### 2026-06-13 — Centered modal (was right-docked drawer)
- **Motivation**: The port had made reading a right-docked drawer; the user
  asked for Curve's original centered-popup design, not a side panel.
- **Goal**: Match Curve's reading layout (centered sheet over a dimmed backdrop).
- **Key decision**: Nest the sheet inside the backdrop and flex-center it
  (mirroring Curve's `.reading-overlay`/`.reading-sheet`), keeping NanoBee's
  white-Stripe sheet styling since the project bans Curve's sketch theme.

### 2026-06-13 — Created
- **Motivation**: Curve's reading overlay is the product's face (flow reading +
  three follow-ups + bold deep-dive); reproduce it in NanoBee's style.
- **Goal**: One panel that closes the read → follow-up → grow loop.
- **Key decision**: (superseded) Right-docked panel; later changed to a centered
  modal to match Curve's original design.
