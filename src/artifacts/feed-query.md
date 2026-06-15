# feed-query.ts

FeedQuery DSL: the structured query a chat message is parsed into for a **data view**
(the redefined Artifacts feature). Closed contract between the `create_data_view`
chat tool and the data pipeline. Pure types only; zod schema is worker-side.

- `FeedQuery` = `{ source, filter, sort, defaultView, title }`.
- `FeedFilter` = `{ topic, keywords?, minPoints?, timeRange?, sourceParams? }`.
- `DataViewMode` = `list | card | table | timeline` (mirrors URL `vm`).

## 变更历史与出发点
- 2026-06-15 新建。Artifacts 从「背单词卡组」纠偏为「聊天生成数据视图」，需要一个
  自然语言→结构化查询的封闭契约。类型放共享层，zod 校验放 worker 层以保持客户端轻量。
  权威契约见 `private/docs/artifacts-data-views-design.md`（3.1）。
