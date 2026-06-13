# components/artifacts/ArtifactShortcuts.tsx

## 文件职责
Artifacts 页面的快捷生成入口:一排预设 chip,点击即用一句固定 prompt 跑生成(经聊天管线的 create_card_artifact agent 工具),生成的 deck 直接出现在本页,无需打字。

## 核心导出 / API
- `ArtifactShortcuts()`

## 依赖关系
- 上游：`store/useAppStore.ts`(runArtifactShortcut / artifactGenerating)、`icons/icons.tsx`
- 下游：`components/artifacts/ArtifactsView.tsx`

## 关键实现思路
- 预设为纯数据数组 `SHORTCUTS`(当前都是单词主题),新增 kind 的快捷项就加在这里——单一扩展点
- 生成中禁用所有 chip,避免并发触发
- 自身不含生成逻辑,只调用 store.runArtifactShortcut

## 变更历史

### 2026-06-13 — 创建
- **出发点**：用户要"快捷入口，点击就运行"
- **目标**：一排 chip 一键生成常用单词卡片
- **关键决策**：复用聊天生成管线(canned prompt),不另开生成路径;预设集中为数据数组便于扩展
