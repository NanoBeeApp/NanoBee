# src/components/research/ResearchTraceModal.tsx

## Responsibility
Debug modal rendering a `ResearchGenerationTrace`: run metadata (provider /
model / mode / step count / duration), ok-or-fail + repaired badges, and the
ordered pipeline steps — each with a status dot, the messages sent to the
model, the raw model output, timing, and any error. Pure render: receives the
trace and an `onClose`.

## Core exports / API
- `ResearchTraceModal({ trace, onClose })` — mostly render; owns only its
  close-handling effect (Escape / outside-click / ✕), no data fetching
- Testids: `research-trace-modal` / `research-trace-meta` /
  `research-trace-step-{i}` / `research-trace-close`

## Dependencies
- Upstream: `ResearchTraceLauncher.tsx` (owns the open/close state)
- Downstream: `research/generation-trace` (types), `styles/research-trace.css`,
  icons

## Notes
- Mirrors the chat `AgentTraceModal` pattern (container/presentational split)
  but renders research's `steps[]` pipeline rather than the agent loop's
  `iterations[]`.
- Reuses the global modal shell classes (`nb-modal-scrim` / `nb-modal` /
  `nb-ai-close` from app.css); all step styling is research-scoped
  (`rc-trace-*` in research-trace.css) so it doesn't depend on the chat
  stylesheet. Follows app conventions: surface tints over borders, mono font
  for payloads, Radix grass/red status dots; raw output scrolls in a capped
  block so a long reply can't blow up the modal.

## Change history

### 2026-07-02 — Fix: modal was uncloseable (portal + document-root event bug)
- **Motivation**: clicking outside the modal (and even the ✕) did nothing — the
  modal could not be closed. Reproduced via Playwright: real clicks on the scrim
  and ✕ leave it open, while a synthetic `.click()` closes it.
- **Root cause**: this is the ONLY modal that `createPortal`s to `document.body`,
  and the app is hydrated on `document` (`hydrateRoot(document, …)`). In that
  configuration React's synthetic click delegation does not fire for real user
  clicks inside the portal, so the scrim's and button's `onClick={onClose}` never
  ran. There was also no Escape handler.
- **Key decision**: drive close from NATIVE listeners bound in a `useEffect`
  while mounted — `keydown` Escape, a capture-phase `document` `pointerdown` with
  a `panelRef.contains` test for click-outside (immune to stopPropagation and to
  the delegation bug), and a native `click` on the close button via `closeBtnRef`.
  Dropped the now-dead React `onClick`s and the panel's `stopPropagation`. Matches
  the CLAUDE.md lightweight-overlay rule (capture-phase, ref-contains, Esc,
  mount/unmount binding). Other modals render in-tree and are unaffected.

### 2026-06-15 — created
- **Motivation**: let users inspect, from the research canvas, exactly how the
  outline and each article were generated (every execution step) for debugging.
- **Goal**: a pure-render modal for `ResearchGenerationTrace`, reusing the chat
  trace modal's look while fitting research's prompt→parse→repair pipeline.
- **Key decision**: pure render + state in `ResearchTraceLauncher`, matching the
  project's container/presentational split; self-contained `rc-trace-*` styles.
