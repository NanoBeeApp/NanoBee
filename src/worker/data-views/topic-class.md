# topic-class.ts

Deterministic (zero-LLM) topic classifier. `classifyTopic(topic)` → coarse class
id (`ai|dev|finance|news|general`). Used as a data view's `topic_id` and, later,
as part of the AI card-template cache signature.

## 变更历史与出发点
- 2026-06-15 新建（P1）。纯函数保证同 topic 同 class，便于缓存与今日页分组。P1 仅用作
  topic_id 归类；P2 接入模板缓存签名。
