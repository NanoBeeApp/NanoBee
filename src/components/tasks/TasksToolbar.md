# TasksToolbar.tsx

## Responsibility
Manager toolbar: a back link to the home screen, the title + run summary, then the
view switch (list/table/board), kind filter chips and a search box. Pure render —
all state is owned by AllTasksView / the URL.

## Dependencies
- Upstream: `src/types.ts` (`Task`), `routes/_app/tasks` (`TasksViewMode`), `Icons`
- Downstream: AllTasksView

## Change history

### 2026-06-15 — Created
- **Motivation**: The manager needs its controls (back, view switch, filters, search) in one stateless bar.
- **Goal**: Render the controls and emit callbacks; keep all state in the parent / URL.
