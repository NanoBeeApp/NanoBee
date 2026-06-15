# pipeline.ts

The data-view pipeline. `runDataViewPipeline(env, viewId, owner, query)` runs the
P1 closed loop: `fetching → invokeDataSource (data-hub) → upsert items → ready`,
recording terminal failure as `pipeline_status='error'` (never throws). Runs
server-side, typically via `executionCtx.waitUntil` for 秒回; frontend polls
`GET /api/artifacts/:id` until ready. AI filter/extract/template stages are P2/P3.

`fetchParams` passes through `sourceParams` and falls back topic→`query` so a
topical view narrows (e.g. HN search "AI").

## 变更历史与出发点
- 2026-06-15 新建（P1）。运行位置裁决：管线在 Worker（依赖 env.DB / data-hub 网关），
  非浏览器 agent。所有 IO 走 invokeDataSource + D1 repo，CF 与自托管一致。
