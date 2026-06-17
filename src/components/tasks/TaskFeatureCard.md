# TaskFeatureCard

One "重点盯梢" featured card in the top strip. Renders three shapes off the same
view-model:
- a **dark live-monitor** card (when the task carries a `metric` + `spark`),
- a **batch-progress** card (when it has `children`),
- the default **condition/schedule** card (a result preview).

Clicking opens the task's detail drawer.

## Change history & motivation
- 2026-06-17 — Created for the design rebuild (the featured strip is new vs the
  old home/all surfaces).
