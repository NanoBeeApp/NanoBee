# TaskAtoms

The small shared primitives the Tasks-page renderers reuse: `TpToggle` (enable
switch), `TpStatusBadge` (active / paused / attention pill), `TpTypeBadge`
(schedule / condition / batch), and `TpSparkline` (the dark monitor card's
filled-area sparkline). Kept together and pure so the row / card / table /
kanban / drawer all render identical chrome.

## Change history & motivation
- 2026-06-17 — Created for the design rebuild (replaces the old `TaskStatusDot` /
  `TaskTypeBadge` atoms with the design's `tp-` styled equivalents).
