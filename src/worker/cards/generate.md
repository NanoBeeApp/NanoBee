# worker/cards/generate.ts

## 文件职责
卡片 deck 生成：用 kind 专属 prompt 驱动配置的 AI 模型，按该 kind 的契约校验回复，首次失败则带修复指令重试一次。

## 核心导出 / API
- `generateCardDeck(cfg, input)`：生成一个 `CardDeck`；模型不可达或两次都违约则抛错

## 依赖关系
- 上游：`worker/ai/client.ts`(generateChatText)、`worker/ai/settings.ts`(AiRuntimeConfig)、`cards/contract.ts`、`cards/prompt.ts`、`cards/types.ts`
- 下游：`worker/routes/cards.ts`

## 关键实现思路
- 复用聊天链路同一套 per-user provider 配置(与 research 功能相同的集成点)
- 仿 `research/generate.ts` 的"先解析→失败带上一条坏回复 + REPAIR 指令重试一次"
- kind/metadata 在 `finalize` 中附加到模型 payload 上

## 变更历史

### 2026-06-13 — 创建
- **出发点**：动态卡片需要把 LLM 输出稳定转成校验通过的 deck
- **目标**：通用生成函数，按 kind 查 spec 取 prompt 与 schema
- **关键决策**：复用 generateChatText 而非新建模型客户端；保留一次修复重试提升健壮性
