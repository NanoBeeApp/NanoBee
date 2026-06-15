# components/artifacts/ArtifactsTabs.tsx

## 文件职责
Artifacts 页面顶部 tab 栏的纯渲染组件:两个固定个人 tab(你创建的 / 你收藏的)+ 分类 tab(金融/科技/开发者…)。

## 核心导出 / API
- `ArtifactsTabs({ activeTab, onSelect })`

## 依赖关系
- 上游：`artifacts/recommended.ts`(ARTIFACT_CATEGORIES)、`icons/icons.tsx`
- 下游：`ArtifactsView.tsx`

## 关键实现思路
- 纯渲染,active 与切换回调由父级(经 useArtifactsUrlSync)传入,tab 值即 URL `tab` 参数
- 个人 tab 与分类 tab 间用空白 gap 分隔(不画硬线,遵守弱化 border 规则)
- 每个 tab 带 role/aria-selected 与 data-testid

## 变更历史

### 2026-06-15 — 创建
- **出发点**：artifacts 页需要顶部 tabs
- **目标**：个人 tab + 分类 tab 的纯渲染栏
- **关键决策**：分类来自 recommended 目录,纯渲染易测;用 gap 而非分割线
