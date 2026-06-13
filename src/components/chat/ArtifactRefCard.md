# components/chat/ArtifactRefCard.tsx

## 文件职责
聊天内对生成 artifact 的引用卡片。当 agent 在回复时创建了卡片 deck,渲染在 AI 回复下方;点击打开 Artifacts 页并聚焦该 artifact(deck 在那里渲染,聊天流保持轻量)。

## 核心导出 / API
- `ArtifactRefCard({ refs })`

## 依赖关系
- 上游：`store/useAppStore.ts`(openArtifacts)、`icons/icons.tsx`、`artifacts/types.ts`(ArtifactRef)
- 下游：`components/chat/MessageView.tsx`(AI 消息携带 artifacts 时渲染)

## 关键实现思路
- 纯展示 + 一个 openArtifacts(id) 跳转动作
- 不内联渲染整副 deck,避免聊天流过重

## 变更历史

### 2026-06-13 — 创建
- **出发点**：聊天触发生成后,需要在对话里给出可点击的产物入口
- **目标**：一张轻量引用卡,点击跳到 Artifacts 页对应项
- **关键决策**：聊天只放引用不放整副卡片;跳转复用 store.openArtifacts
