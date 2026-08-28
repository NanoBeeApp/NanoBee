# styles/research-trace.css

## Responsibility
Styles for the research generation-trace debug modal (`ResearchTraceModal`) and
its entry pill (`ResearchTraceLauncher`). Relies on the shared modal shell
(`.nb-modal-scrim` / `.nb-modal` / `.nb-ai-close`); everything else is
`rc-trace-*`.

## Implementation notes
- `.rc-trace-open--outline` tucks under the canvas banner (negative top margin).
- `.rc-trace-open--content` is in the reading scroll flow above the title, with
  `max-width: calc(100% - 44px)` so it cannot crowd the floating close button.
  It is not absolutely positioned.

## Verification
- Open a research article that has a generation trace: the "查看生成过程" pill
  sits above the title and does not overlap it (root node and child node).
- Click the pill: the trace modal still opens via portal.

## Change history

### 2026-08-28 — Content entry no longer floats
- **Motivation**: absolute top-left placement overlapped the article title.
- **Goal**: keep the pill in document flow.
- **Key decision**: drop `position: absolute` on `.rc-trace-open--content`;
  cap width like `.rc-reading-back`.

### 2026-06-15 — Created with the trace modal
- **Motivation**: isolate trace-debug chrome from the rest of research CSS.
- **Goal**: one file for the modal and its two entry placements.
