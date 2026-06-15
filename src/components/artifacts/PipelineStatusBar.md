# PipelineStatusBar.tsx

Non-blocking pipeline status strip for the data-view detail: thin honey progress
bar + label while fetching, an error notice on failure, nothing once ready. Pure
render. Respects `prefers-reduced-motion` (the bar stops animating).

## 变更历史与出发点
- 2026-06-15 新建（P1）。分阶段上屏的可见反馈，失败不阻塞整页（降级提示）。
