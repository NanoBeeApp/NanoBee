# 0022_data_view_items.sql

Per-item stream for a data view. One row per fetched item, deduped by
`UNIQUE(view_id, content_hash)` so re-fetches use `INSERT OR IGNORE`. Stores the
full normalized source item as `raw_json` for dynamic card binding. `owner`
denormalized for cheap deletes/queries.

## 变更历史与出发点
- 2026-06-15 新建（P1）。承载数据视图拉取到的条目；content_hash 唯一约束保证刷新幂等。
  AI 抽取字段/相关性打分留待 P2 以独立列/表加入。自托管 Postgres 副本需删 `PRAGMA optimize`。
