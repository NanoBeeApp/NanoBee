# components/artifacts/ArtifactGallery.tsx

## 文件职责
tab 栏下方的内容区。按 active tab 决定展示:mine=你的 deck(空→空态+「为你推荐」)、favorites=收藏的 deck(空→空态+推荐)、分类=该分类的一键生成模板。拥有 store 接线(打开/收藏/删除/生成),卡片(ArtifactCard/RecommendedCard)保持纯渲染。

## 核心导出 / API
- `ArtifactGallery({ tab })`

## 依赖关系
- 上游：`store/useAppStore.ts`(artifacts/artifactGenerating/selectArtifact/toggleFavorite/deleteArtifact/runArtifactShortcut)、`artifacts/recommended.ts`、`ArtifactCard`、`RecommendedCard`、`icons/icons.tsx`
- 下游：`ArtifactsView.tsx`

## 关键实现思路
- `isCategory` 判断 tab 是否分类;分类→模板网格;mine/favorites→owned 网格或空态+推荐
- 空态底部「为你推荐 · 热门项目」用 recommendedForYou()(各分类首个,保证多样)
- 顶部生成中横幅复用 nb-arti-generating
- 收藏过滤直接 artifacts.filter(a => a.favorited),数据层一次返回 favorited

## 变更历史

### 2026-06-15 — 创建
- **出发点**：tabs 改造需要按 tab 切换的内容区,空态要展示推荐/热门
- **目标**：mine/favorites/分类三类内容 + 空态推荐
- **关键决策**：container 接 store,卡片纯渲染;推荐复用快捷生成管线;空态用跨分类推荐保证多样性
