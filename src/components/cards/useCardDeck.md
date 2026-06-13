# components/cards/useCardDeck.ts

## 文件职责
动态卡片视图的状态 hook：持有当前 deck、loading/error 标志，并提供 `generate` 动作调用 `POST /api/cards/generate`。与视图分离以便视图保持纯渲染。

## 核心导出 / API
- `useCardDeck()` → `{ deck, loading, error, generate }`

## 依赖关系
- 上游：`lib/api-client.ts`(typed RPC)、`cards/types.ts`
- 下游：`components/cards/CardsView.tsx`

## 关键实现思路
- 本地 useState，不进全局 store(自包含功能)
- 日志先打字符串再打对象，便于复制(项目日志规则)

## 变更历史

### 2026-06-13 — 创建
- **出发点**：CardsView 需要触发生成并管理异步状态
- **目标**：把数据获取从展示中抽离
- **关键决策**：用局部 hook 而非 zustand slice，功能自包含、解耦
