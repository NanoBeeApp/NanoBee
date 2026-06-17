# TaskDetailDrawer

The right-side detail drawer for one task, rebuilt to the design. Top to bottom:
header (icon + title + status/topic + run-count), the "对话即配置" natural-language
trigger spec with an editable line and a collapsible structured-fields escape
hatch, batch subtasks (when present), the latest result / failure block, the
run-history timeline, and the action bar (run now / continue chat / pause-resume
/ delete).

## Wiring
- Run history prefers the real server timeline (`GET /api/tasks/:id/runs`) and
  falls back to the view-model's derived history for seed/legacy tasks.
- pause/resume → `toggleTask`; delete → `deleteTask`; continue chat → `openChat`.
- "立即运行" and the NL-edit input are toasts (those backends are a later concern).
- Opened via the URL `?task=id` so it survives refresh / deep links.

## Change history & motivation
- 2026-06-17 — Rewritten to the design's `tp-drawer`. Replaced the old config-row
  layout with the NL spec + escape-hatch + failure-with-suggestion blocks.
  Inlined the run-history fetch (was the separate `TaskRunHistory` component) so
  it renders with the design's `tp-tl` timeline; static batch children replace
  the live-polling `BatchSubtasks` panel.
