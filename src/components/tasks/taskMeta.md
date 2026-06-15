# taskMeta.ts

## Responsibility
Display helpers shared by every task surface (home overview, list, table, board,
detail drawer): derive the higher-level `TaskKind` (from an explicit `kind` or
`triggerType`), the kind badge label/tone, the status-dot tone, and a short human
status line. One source of truth so the surfaces never diverge.

## Core exports
- `taskKind(task) → TaskKind`
- `kindMeta(task) → { label, tone }`
- `statusTone(task) → StatusTone` (active | paused | running | failed | done)
- `statusLabel(task) → string`

## Dependencies
- Upstream: `src/types.ts` (`Task`, `TaskKind`)
- Downstream: TaskTypeBadge, TaskStatusDot, TaskRow, TaskTableView, TaskBoardView, TaskDetailDrawer

## Change history

### 2026-06-15 — Created
- **Motivation**: The redesigned Tasks page renders the same task across five surfaces; each needed identical kind/status derivation.
- **Goal**: Centralize kind/status display logic so views stay consistent and branch-free.
