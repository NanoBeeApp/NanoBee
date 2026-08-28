# styles/research.css

## Responsibility
Scoped styles for the Research Canvas (`.rc-*`): welcome screen, outline
viewport, node cards, reading overlay, and the in-place welcome load/error copy.
White surface, minimal chrome; generation progress lives in the canvas skeleton,
not a floating pill.

## Implementation notes
- `.rc-welcome-status` / `.rc-welcome-error` sit in the welcome body (in place,
  ≥12px) so a failed `?project=` deep link is explained instead of looking empty.
- The only floating chrome is `.rc-actions-error` on the live canvas; it offsets
  past the fixed sidebar so it is neither hidden nor covering the outline.
- `.rc-outline-retry` is the in-place failed-outline card (replaces the skeleton).

## Verification
- Open `/research?project=<missing-id>`: welcome shows the in-place error line.
- Open `/research` with a healthy list: no error line, composer unchanged.
- Open a project whose outline failed: canvas shows the retry card, not the skeleton.

## Change history

### 2026-08-28 — In-place outline retry card
- **Motivation**: a failed outline must not stay on the skeleton, and must
  not float a pill over the canvas.
- **Goal**: `.rc-outline-retry` sits where the skeleton was (same column,
  content-sized chip) with ≥12px copy.
- **Key decision**: danger border on a white card; the chip is the existing
  `.rc-chip` so the retry matches the reading-overlay failed control.

### 2026-08-28 — Welcome load/error copy
- **Motivation**: deep-link 404s were silent on the welcome screen.
- **Goal**: in-place status/error lines above the composer.
- **Key decision**: reuse the welcome column (not a floating pill) so the canvas
  metaphor stays unobstructed when no project is open.

### 2026-06-13 — Created with the Research Canvas
- **Motivation**: isolate research layout from the rest of the app shell.
