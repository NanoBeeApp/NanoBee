# artifacts/types.ts

## 文件职责
Artifacts 共享领域类型。Artifact = 由聊天消息动态生成的一份数据(当前都包裹一个卡片 deck),信封刻意与 deck 解耦,便于未来承载其他 payload。

## 核心导出 / API
- `Artifact`：完整产物(id/kind/title/cardCount/deck/chatId?/createdAt)
- `ArtifactRef`：轻量引用(id/kind/title/cardCount),挂在生成它的 AI 聊天消息上,点击打开 Artifacts 页

## 依赖关系
- 上游：`cards/types.ts`(CardDeck/CardKind)
- 下游：`worker/artifacts/repo.ts`、`worker/agent/card-artifact-tools.ts`、`worker/routes/artifacts.ts`、`store/useAppStore.ts`、`components/artifacts/*`、`components/chat/ArtifactRefCard.tsx`、`types.ts`(AiMessage.artifacts)

## 关键实现思路
- 平台无关,worker 与 client 共用
- ArtifactRef 只携带展示所需的最小字段;完整 deck 在 Artifacts 页按需加载

## 变更历史

### 2026-06-13 — 创建
- **出发点**：用户把交互改为"聊天触发生成 + 独立 artifacts 页面收集",卡片列表是一份动态生成的数据(artifact)
- **目标**：定义 artifact 信封与聊天内引用类型
- **关键决策**：信封与 deck 解耦,先只承载卡片 deck;引用与完整体分离,聊天流保持轻量
