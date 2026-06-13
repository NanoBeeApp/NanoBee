# cards/prompt.ts

## 文件职责
每种卡片 kind 的生成规格(CardKindSpec)注册表与 prompt 构建。每个 spec 打包该 kind 所需的一切：展示元信息、卡片 schema、数量范围、prompt 构建器。worker 按 kind 查表后即与具体 kind 无关——新增数据类型 = 这里加一个 spec + 客户端加一个渲染器。

## 核心导出 / API
- `CardKindSpec`：单种 kind 的完整规格接口
- `CARD_KIND_SPECS`：kind id → spec 的注册表(当前仅 word)
- `getCardKindSpec(kind)`：查表，未知 kind 抛错
- `resolveCount(spec, requested?)`：把请求数量夹进 kind 允许区间
- `CARD_REPAIR_INSTRUCTION`：首次回复违约时的修复重试指令

## 依赖关系
- 上游：`cards/contract.ts`(wordCardSchema)、`cards/types.ts`
- 下游：`worker/cards/generate.ts`

## 关键实现思路
- prompt 文本为中文(面向中文用户的产品输出)，代码/注释英文(公开仓库语言规则)
- word 的 system prompt 硬约束 JSON 结构、字段齐全、数量精确、内容质量(真实拼写/音标/释义例句对应)
- 注册表模式让生成管线对 kind 完全解耦

## 变更历史

### 2026-06-13 — 创建
- **出发点**：要把"不同数据不同卡片"做成可扩展框架，而非单词专用
- **目标**：用一个 spec 注册表承载每种 kind 的全部生成知识
- **关键决策**：把 prompt 构建、schema、数量范围都收进 CardKindSpec，worker 只认 spec 不认具体 kind
