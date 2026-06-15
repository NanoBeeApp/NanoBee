# feed-query-schema.ts

Worker-side zod schema + `parseFeedQuery(args, allowedSources)` for the FeedQuery
DSL. Validates the create_data_view tool's model arguments; throws a
model-readable error on invalid input (model retries). Title guard strips
`<>"「」\n` so a model-set title can't break a prompt/markup boundary.

## 变更历史与出发点
- 2026-06-15 新建（P1）。zod 仅进 worker bundle（客户端只用纯类型）。source 受限于实时
  data-hub 已注册 id（防幻觉源）。
