# TaskStatusDot.tsx

## Responsibility
Colored status dot: active green / paused gray / running amber-pulse / failed red
/ done blue. Pure render. The amber "running" dot is the only looping animation on
the page (a small, restrained pulse).

## Dependencies
- Upstream: `taskMeta` (`statusTone`), `src/types.ts` (`Task`)
- Downstream: TaskRunningOverview, TaskRow, TaskBoardView

## Change history

### 2026-06-15 — Created
- **Motivation**: Every task surface shows a status dot; needed one atom with consistent tones + the running pulse.
- **Goal**: A single reusable status indicator driven by `statusTone`.
