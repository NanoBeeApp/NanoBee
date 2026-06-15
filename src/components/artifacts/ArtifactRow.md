# components/artifacts/ArtifactRow.tsx

## 文件职责
列表视图里一行「已创建 artifact」（你创建的 / 你收藏的）。Twitter feed 式平铺行——无卡片边框，靠 hairline 分割线 + hover 背景区分，不做成盒子。点整行进 deck 详情；尾部按钮收藏/删除不触发打开。纯渲染。

## 核心导出 / API
- `ArtifactRow({ artifact, onOpen, onToggleFavorite, onDelete })`

## 依赖关系
- 上游：`artifacts/types.ts`、`artifacts/format.ts`(artifactMeta)、`icons/icons.tsx`
- 下游：`ArtifactGallery.tsx`（list 视图）

## 关键实现思路
- 复用 `.nb-arti-card-fav` / `.nb-arti-card-del` 按钮样式（删除 hover 才显）
- 收藏 testid 与卡片一致 `artifact-favorite-{id}`（同时只渲染一种视图，不冲突）

## 变更历史

### 2026-06-15 — 创建
- **出发点**：用户嫌卡片丑，默认改用轻量平铺列表
- **目标**：无卡片 chrome 的平铺行
- **关键决策**：hairline 分割线 + hover 背景（遵守「列表参考 Twitter 平铺、禁逐条做卡片」）
