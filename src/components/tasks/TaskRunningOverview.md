# TaskRunningOverview.tsx

## Responsibility
The quiet "正在为你运行" block under the composer: at most a few read-only rows
(status dot + title + one gray status line) plus a "查看全部 →" link into the
manager. Carries no toggles / badges / menus so it stays subordinate to the
composer (the home screen's single focus). Renders nothing when the user has no
tasks, so a new user sees only the composer.

## Dependencies
- Upstream: `useAppStore` (`tasks`), TaskStatusDot, `taskMeta` (`statusLabel`), `Icons`
- Downstream: TasksHome

## Change history

### 2026-06-15 — Created
- **Motivation**: The home screen should reassure the user about running tasks without becoming a management surface.
- **Goal**: A minimal, subordinate preview (a few rows) that links into the full manager; empty → nothing.
