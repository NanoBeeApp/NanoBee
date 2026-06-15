# components/artifacts/RecommendedCard.tsx

## 文件职责
一张「推荐模板」卡片的纯渲染:分类 tab 与空态「为你推荐」里用。点击运行模板的预设 prompt 一键生成 deck。

## 核心导出 / API
- `RecommendedCard({ template, icon, onRun, disabled })`

## 依赖关系
- 上游：`artifacts/recommended.ts`(RecommendedTemplate)、`types.ts`(IconName)、`icons/icons.tsx`
- 下游：`ArtifactGallery.tsx`

## 关键实现思路
- 纯渲染;`onRun(prompt)` 由 gallery 接到 store.runArtifactShortcut
- icon 由 gallery 解析分类图标传入,组件本身与分类解耦
- 生成进行中 disabled 防重入
- data-testid: recommended-card-{id}

## 变更历史

### 2026-06-15 — 创建
- **出发点**：分类 tab 与空态需要一键生成入口
- **目标**：展示模板标题/副标题/徽标 + 一键生成
- **关键决策**：复用既有 runArtifactShortcut 管线,点击即生成真实 artifact
