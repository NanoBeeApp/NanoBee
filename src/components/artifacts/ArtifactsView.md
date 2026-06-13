# components/artifacts/ArtifactsView.tsx

## 文件职责
Artifacts 页面——渲染 AI 在聊天中生成的卡片 deck。deck 列表已移到左侧边栏(`ArtifactsNavList`),本页为 detail-only:铺满整个中央区域,用共享 CardDeckRenderer 渲染选中 deck,无选中时显示空状态。本页只展示不生成(生成在聊天里)。

## 核心导出 / API
- `ArtifactsView()`

## 依赖关系
- 上游：`store/useAppStore.ts`(artifacts/selectedArtifactId/loadArtifacts/selectArtifact/deleteArtifact)、`icons/icons.tsx`、`components/cards/CardDeckRenderer.tsx`
- 下游：`App.tsx`(view === 'artifacts' 时渲染)

## 关键实现思路
- 首次打开 useEffect 触发 loadArtifacts,确保刚生成的 artifact 在列
- 选中项缺失时默认选最新
- 空状态引导用户去聊天里说"每天教我10个单词"
- 复用 CardDeckRenderer,渲染逻辑零重复

## 变更历史

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
