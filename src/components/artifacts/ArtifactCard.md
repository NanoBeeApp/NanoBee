# components/artifacts/ArtifactCard.tsx

## 文件职责
gallery 网格里一张「已创建 artifact」卡片的纯渲染。点卡片主体打开 deck 详情;角上按钮收藏 / 删除(不打开)。

## 核心导出 / API
- `ArtifactCard({ artifact, onOpen, onToggleFavorite, onDelete })`

## 依赖关系
- 上游：`artifacts/types.ts`(Artifact)、`icons/icons.tsx`
- 下游：`ArtifactGallery.tsx`

## 关键实现思路
- 纯渲染,所有动作由 gallery 注入
- 收藏星常显(反映状态),删除按钮 hover 才显
- 角上按钮 stopPropagation 避免冒泡到打开;支持 Enter/Space 键盘打开
- data-testid 用业务语义(artifact-card-{id}/artifact-favorite-{id}/artifact-card-delete-{id})

## 变更历史

### 2026-06-15 — 创建
- **出发点**：你创建的/你收藏的 tab 需要网格卡片
- **目标**：可点击打开 + 收藏 + 删除的纯渲染卡片
- **关键决策**：纯渲染、动作注入;星常显删 hover 显,降低静止时视觉噪音
