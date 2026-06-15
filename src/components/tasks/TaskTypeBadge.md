# TaskTypeBadge.tsx

## Responsibility
Tiny pill showing the task kind (定时 / 监控 / 一次性 / 批量). Pure render.

## Dependencies
- Upstream: `taskMeta` (`kindMeta`), `src/types.ts` (`Task`)
- Downstream: TaskRow, TaskTableView, TaskBoardView, TaskDetailDrawer

## Change history

### 2026-06-15 — Fix Chinese characters in file-top comment
- **Motivation**: Public repo rule — all code comments must be in English.
- **Change**: Replaced the Chinese kind labels in the file-top comment with English equivalents (schedule / condition / one-off / batch).

### 2026-06-15 — Created
- **Motivation**: Multiple task surfaces show the kind badge; needed one styled atom.
- **Goal**: A single reusable, theme-tokened badge driven by `kindMeta`.
