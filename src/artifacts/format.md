# artifacts/format.ts

## 文件职责
artifacts 的展示格式化集中地：card kind 标签与元信息行（「单词 · 10 张」）。供 card / row / table 渲染器与侧边栏列表统一引用，消除多处重复的 KIND_LABEL。

## 核心导出 / API
- `kindLabel(kind)`：card kind → 中文标签（回退原值）
- `artifactMeta(a)`：deck 标题旁的一行元信息，如「单词 · 10 张」

## 依赖关系
- 上游：`artifacts/types.ts`(Artifact)
- 下游：`components/artifacts/ArtifactCard`、`ArtifactRow`、`ArtifactGallery`（table）

## 变更历史

### 2026-06-15 — 创建
- **出发点**：artifacts 加列表/表格视图后，KIND_LABEL 在 card/row/table/侧边栏会四处重复
- **目标**：抽出统一的 kind 标签与元信息格式化
- **关键决策**：纯函数、平台无关，所有视图共用一处
