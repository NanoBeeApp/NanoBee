# components/artifacts/ArtifactsView.tsx

## 文件职责
Artifacts 页面——收集 AI 在聊天中生成的所有卡片 deck。每个 artifact 是一份动态生成的数据(当前为单词 deck)。master/detail 布局:左侧 artifact 列表,右侧用共享 CardDeckRenderer 渲染选中 deck。当前仅展示,本页不生成(生成在聊天里)。

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

### 2026-06-13 — 创建
- **出发点**：用户要求独立 artifacts 页面收集聊天生成的卡片数据
- **目标**：列出 + 渲染 artifact deck 的 master/detail 页
- **关键决策**：本页只读不生成;复用卡片渲染器;白底、左列表+右详情最大化内容区
