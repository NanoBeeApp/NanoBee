# components/artifacts/ArtifactsView.tsx

## 文件职责
Artifacts 页面的编排者(orchestrator)。顶部 tab 栏(你创建的 / 你收藏的 + 分类),内容是分 tab 的浏览 gallery;选中某个 deck 时切到详情视图。本身只负责 URL↔store 同步与「gallery vs 详情」切换,具体 UI 拆给 `ArtifactsTabs` / `ArtifactGallery` / `ArtifactDetail`。本页只触发生成不拥有生成逻辑。

## 核心导出 / API
- `ArtifactsView()`

## 依赖关系
- 上游：`useArtifactsUrlSync`(tab + 选中 deck 的 URL 同步)、`store/useAppStore.ts`(artifacts/selectedArtifactId/loadArtifacts)、子组件 `ArtifactsTabs`/`ArtifactGallery`/`ArtifactDetail`
- 下游：路由 `routes/_app/artifacts.tsx`

## 关键实现思路
- 首次打开 useEffect 触发 loadArtifacts,确保刚生成的 artifact 在列
- `selectedId` 命中已加载 artifact → 渲染 `ArtifactDetail`(隐藏 tab,deck 占满);否则渲染 tab + gallery
- tab 状态只存 URL(`?tab=`),选中 deck 存 URL(`?artifact=`)并镜像 store,供侧边栏高亮

## 变更历史

### 2026-06-15 — 顶部 tabs + 浏览 gallery
- **出发点**：用户要 artifacts 页顶部加 tabs(你创建的/你收藏的/各分类),新用户默认进「你创建的」空态并在底部展示推荐/热门项目
- **目标**：把 detail-only 页改成分 tab 浏览 gallery,空态带「为你推荐」,分类 tab 展示一键生成模板
- **关键决策**：本组件降为编排者,UI 拆成 Tabs/Gallery/Detail/卡片;tab 与选中 deck 都进 URL(URL 即状态);loadArtifacts 不再自动选中最新,默认落在 gallery

### 2026-06-13 — 快捷生成入口 + 生成中状态
- **出发点**：用户要"快捷入口，点击就运行",免去打字
- **目标**：详情区顶部加 `ArtifactShortcuts` 一排预设 chip,点击即生成;生成时显示 `nb-arti-generating` 横幅;空状态文案改为引导用快捷入口
- **关键决策**：本页仍不拥有生成逻辑,点击走 store.runArtifactShortcut(经聊天管线 + agent 工具),页面只负责触发与展示

### 2026-06-13 — detail-only (deck list moved to the sidebar)
- **Motivation**: the user asked that the Artifacts page's list live in the
  sidebar like every other page, so the in-page master list was now duplicate
  chrome.
- **Goal**: remove the left `nb-arti-list` column and let the selected deck fill
  the whole center surface (maximize content area).
- **Key decision**: kept the detail markup (`nb-arti-detail` is now the root,
  centered via `margin:auto`); the deck list lives in the new `ArtifactsNavList`
  sidebar component, which drives `selectArtifact`.

### 2026-06-13 — 创建
- **出发点**：用户要求独立 artifacts 页面收集聊天生成的卡片数据
- **目标**：列出 + 渲染 artifact deck 的 master/detail 页
- **关键决策**：本页只读不生成;复用卡片渲染器;白底、左列表+右详情最大化内容区
