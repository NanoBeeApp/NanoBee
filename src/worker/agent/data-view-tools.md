# data-view-tools.ts

The `create_data_view` chat agent tool — entry point of the redefined Artifacts
feature (replaces the old `create_card_artifact`). Parses a chat request into a
FeedQuery (zod-validated, source constrained to the live data-hub catalog),
persists a `pending` data view, pushes its `ArtifactRef` onto the chat context
(inline card), and kicks off `runDataViewPipeline` via `executionCtx.waitUntil`
(秒回; falls back to inline await). Only offered when the request carries
artifact context.

## 变更历史与出发点
- 2026-06-15 新建（P1），取代 `card-artifact-tools.ts`。`dataViewTools(env, ctx)` 异步以
  读 hub 目录构造 source 枚举（防幻觉源）。工具本身无 LLM 调用（P1 管线只拉取）。
  权威契约见 `private/docs/artifacts-data-views-design.md`（D1）。
