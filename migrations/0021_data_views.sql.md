# 0021_data_views.sql

Extends `artifacts` so one table holds both legacy word decks and the new
data views. Adds: `query_json`, `pipeline_status`, `source`, `topic_id`,
`item_count`, `default_view`, `last_fetched_at`, `error_text`, plus a partial
index over unfinished pipeline rows (for a future cron sweep).

## 变更历史与出发点
- 2026-06-15 新建（P1）。Artifacts 纠偏为「数据视图」。复用 artifacts 表而非新建
  实体，列全部可空/带默认值以不动旧 word 行（deck_json 仍 NOT NULL，data_view 行写 '{}')。
  `item_count` 用 COUNT() 一次性重算回写，禁自增，无高频写竞态。不引入 Durable Objects。
  自托管 Postgres 副本需删 `PRAGMA optimize`。
