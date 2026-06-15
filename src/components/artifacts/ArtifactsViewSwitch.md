# components/artifacts/ArtifactsViewSwitch.tsx

## 文件职责
Artifacts gallery 的「列表 / 表格 / 卡片」视图切换段控件（icon segmented control）。纯渲染，active 模式与切换回调来自页面（useArtifactsUrlSync，视图模式存 URL）。

## 核心导出 / API
- `ArtifactsViewSwitch({ value, onChange })`

## 依赖关系
- 上游：`routes/_app/artifacts.tsx`(ArtifactsViewMode)、`icons/icons.tsx`、`types.ts`(IconName)
- 下游：`ArtifactGallery.tsx`（顶部工具行渲染）

## 关键实现思路
- 三模式：list(Icons.list) / table(Icons.table) / card(Icons.grid)
- 纯渲染、aria-pressed、data-testid=artifacts-view-{id}

## 变更历史

### 2026-06-15 — 创建
- **出发点**：用户要 artifacts 加视图切换（列表/表格/卡片），默认别用卡片
- **目标**：轻量段控件切换视图
- **关键决策**：纯渲染、状态由 URL 驱动；新增 table 图标到 icons
