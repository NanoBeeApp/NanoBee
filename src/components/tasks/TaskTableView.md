# TaskTableView.tsx

## Responsibility
Manager table view: dense rows with multi-select + a light bulk-action bar
(pause/resume, move topic, export, delete) for the high-density "lots of tasks /
batch results" case. The bulk bar is a pale floating strip (no dark block, per the
white-surface rule).

## Dependencies
- Upstream: TaskTypeBadge, `taskMeta` (`statusLabel`, `statusTone`), `TasksEmpty`, `useAppStore` (`deleteTask`, `toast`), `src/types.ts` (`Task`)
- Downstream: AllTasksView

## Key implementation notes
- Selection is local component state (a `Set<string>`); the bulk bar appears only when something is selected.

## Change history

### 2026-06-15 — Created
- **Motivation**: Power users managing many/batch tasks need a sortable, multi-select table — kept off the home screen.
- **Goal**: A dense table with multi-select bulk actions wired to the real store actions.
