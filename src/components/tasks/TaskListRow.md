# TaskListRow

One row in the list view: status dot + icon + title/type + trigger subline, then
the last-result, next-run, status badge, enable toggle and (for batch tasks) a
child-subtask expander. Clicking the row body opens the detail drawer; the
right-side controls stop propagation. Pure render — all state lives in the
parent / URL.

## Change history & motivation
- 2026-06-17 — Created for the design rebuild, replacing the old `TaskRow`
  (`nb-tk-` markup) with the design's `tp-row` markup incl. inline child rows for
  batch tasks.
