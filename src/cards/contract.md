# cards/contract.ts

## 文件职责
动态卡片 AI 输出契约：定义模型必须返回的 deck JSON 形状(zod schema)与容错解析。对"每种 kind 的卡片 schema"泛型化，所有 kind 复用同一信封 + 解析器。

## 核心导出 / API
- `wordCardSchema`：单词卡片的 zod schema
- `deckPayloadSchema(cardSchema)`：泛型 deck 信封 schema(title/subtitle?/cards[])
- `parseDeckPayload(rawContent, cardSchema)`：把模型原文解析+校验为 deck payload，兼容裸 JSON 与夹带在散文中的 `{...}`

## 依赖关系
- 上游：zod、`cards/prompt.ts`(传入对应 kind 的 cardSchema)
- 下游：`worker/cards/generate.ts`

## 关键实现思路
- 仿照 `research/contract.ts` 的容错解析(先 JSON.parse，失败再正则抓首个 `{...}`)
- `cards` 数组 `min(1).max(30)` 防空 deck、限单次规模
- 模型只返回 title/subtitle/cards；kind 与 metadata 由服务端附加

## 变更历史

### 2026-06-13 — 创建
- **出发点**：需要稳定把 LLM 文本转成结构化卡片，且要能被多种卡片类型复用
- **目标**：一个泛型契约 + 容错解析覆盖所有 kind
- **关键决策**：`deckPayloadSchema` 接收 cardSchema 参数实现泛型，而不是为每种 kind 重写解析
