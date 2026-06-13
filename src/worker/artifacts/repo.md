# worker/artifacts/repo.ts

## 文件职责
artifacts 表的 D1 持久化。每个 artifact 一行,完整卡片 deck 以 JSON blob 存储,按 owner(登录用户 id 或 "anon")隔离。

## 核心导出 / API
- `ANON_OWNER`：未登录访客桶
- `createArtifact(db, owner, deck, chatId?)`：插入并返回 Artifact(id 在此生成)
- `listArtifacts(db, owner)`：按时间倒序列出(含完整 deck,上限 100)
- `getArtifact(db, owner, id)`：取单个
- `deleteArtifact(db, owner, id)`：删除

## 依赖关系
- 上游：nanoid、`cards/types.ts`、`artifacts/types.ts`
- 下游：`worker/agent/card-artifact-tools.ts`(创建)、`worker/routes/artifacts.ts`(列/取/删)

## 关键实现思路
- deck 整体存 JSON,不拆分到 per-card 行(读取即整体渲染,卡片形状随 kind 变化,无跨 artifact 卡片查询)
- 损坏 JSON 行在 list/get 时跳过并记日志
- 镜像 research repo 的存储形态

## 变更历史

### 2026-06-13 — 创建
- **出发点**：artifacts 页面需要列出/渲染聊天生成的卡片 deck
- **目标**：最小 CRUD,owner 隔离
- **关键决策**：单行 JSON blob 存储,denormalize card_count 供列表展示
