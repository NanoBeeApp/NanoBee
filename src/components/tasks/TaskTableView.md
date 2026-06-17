# TaskTableView

The compact table view of the manager: a scan-friendly grid (任务 / 类型 / 触发 /
上次运行 / 下次 / 状态). Clicking a row opens the detail drawer. Pure render off
the `TaskVM[]`.

## Change history & motivation
- 2026-06-17 — Rewritten to the design's `tp-table` markup. Dropped the old
  multi-select + bulk-action bar (not part of the design); selection/bulk-ops can
  return later as a separate affordance if needed.
