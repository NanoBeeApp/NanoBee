# components/artifacts/ArtifactDetail.tsx

## 文件职责
单个打开 deck 的详情视图:返回 gallery 的入口、deck 标题 + 收藏/删除动作,再用共享 CardDeckRenderer 渲染 deck。由 ArtifactsView 在有选中 artifact(URL `?artifact=`)时渲染,隐藏 tab 让 deck 占满。

## 核心导出 / API
- `ArtifactDetail({ artifact })`

## 依赖关系
- 上游：`store/useAppStore.ts`(selectArtifact/deleteArtifact/toggleFavorite)、`artifacts/types.ts`、`icons/icons.tsx`、`components/cards/CardDeckRenderer.tsx`
- 下游：`ArtifactsView.tsx`

## 关键实现思路
- 返回 = selectArtifact(null) → 经 URL 同步回 gallery
- 删除 = deleteArtifact(id) 后 selectArtifact(null) 强制回 gallery(而非自动跳到另一张)
- 复用 CardDeckRenderer,渲染零重复

## 变更历史

### 2026-06-15 — 创建(从旧 ArtifactsView 抽出)
- **出发点**：tabs 改造后详情成为 gallery 的子视图,需要单独的聚焦视图
- **目标**：把旧 detail-only 渲染抽成独立组件 + 返回入口
- **关键决策**：删除后强制回 gallery;收藏/删除动作并排放在标题右侧,不占额外栏
