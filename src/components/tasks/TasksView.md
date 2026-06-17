# TasksView

The Tasks page, rebuilt to the NanoBee "自动盯梢" design as a **single unified
surface** (no home/all split): eyebrow + title with summary pills, the
single-focus "一句话建任务" create bar, the "重点盯梢" featured strip, a toolbar
(filters + search + list/table/kanban switch), and the body. The detail drawer,
batch-upload dialog and template picker overlay on top.

## Responsibilities
- Map real `Task[]` → design view-models via `tpModel.toTaskVm` and derive counts
  / featured / filtered lists.
- Drive page state from the URL (`useTasksUrl`): open drawer (`?task`), view mode
  (`?vm`), filter (`?f`), upload dialog (`?upload`), template picker (`?tpl`).
- Create-bar submit routes the user's sentence into a fresh chat
  (`store.composeTask`) so the agent compiles the trigger rule ("对话即配置").
- Search + featured-strip horizontal scroll are local component state.

## Change history & motivation
- 2026-06-17 — Rewritten from the home/all two-surface design to the unified
  single-page design (eyebrow header, amber create bar, featured cards, toolbar,
  list/table/kanban). Replaced the prior `TasksHome` + `AllTasksView` split. Data
  still comes from the store; only the presentation changed.
