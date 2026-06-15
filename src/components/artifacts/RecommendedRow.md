# components/artifacts/RecommendedRow.tsx

## 文件职责
列表视图里一行推荐模板。与 ArtifactRow 同律的平铺行：图标 + 标题（+可选徽标）+ 副标题 + 尾部「生成」。整行点击运行模板预设 prompt 一键生成。纯渲染。

## 核心导出 / API
- `RecommendedRow({ template, icon, onRun, disabled })`

## 依赖关系
- 上游：`types.ts`(IconName)、`artifacts/recommended.ts`(RecommendedTemplate)、`icons/icons.tsx`
- 下游：`ArtifactGallery.tsx`（list 视图：分类 + 空态推荐）

## 关键实现思路
- 整行是 button，generating 时 disabled
- 徽标复用 `.nb-rec-card-badge`
- data-testid=recommended-row-{id}

## 变更历史

### 2026-06-15 — 创建
- **出发点**：推荐区也从笨重卡片改成轻量平铺行（默认 list 视图）
- **目标**：与 owned 行视觉一致的推荐行
- **关键决策**：复用 badge 样式；整行可点即生成
