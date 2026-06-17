# TaskBoardView

The kanban view of the manager: tasks grouped into three status columns
(运行中 / 需处理 / 已暂停). Light columns, gaps not rules; each card is compact
(icon + title + trigger + result). Clicking a card opens the detail drawer; empty
columns show a pale placeholder. Pure render off the `TaskVM[]`.

## Change history & motivation
- 2026-06-17 — Rewritten to the design's `tp-kanban` markup with three
  status-based columns (was four execution-state columns under `nb-tk-board`).
