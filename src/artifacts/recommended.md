# artifacts/recommended.ts

## 文件职责
Artifacts 浏览体验的静态目录：分类 tab（金融/科技/开发者/商务/旅行/学术/生活）+ 每个分类下的推荐模板。也用于空态「你创建的」/「你收藏的」底部的「为你推荐」。纯内容，无生成逻辑。

## 核心导出 / API
- `ArtifactCategory` / `RecommendedTemplate`：类型
- `ARTIFACT_CATEGORIES`：分类数组（tab 顺序），`id` 即 URL `tab` 值
- `RECOMMENDED_TEMPLATES`：所有推荐模板
- `templatesForCategory(id)`：取某分类的模板
- `recommendedForYou(limit=6)`：跨分类「为你推荐」（每个分类取首个）
- `categoryLabel(id)`：分类 id → 中文标签

## 依赖关系
- 上游：`types.ts`(IconName)
- 下游：`components/artifacts/*`（tab 栏、gallery、推荐卡片）

## 关键实现思路
- 每个模板是一次「一键生成」的种子：点击把 `prompt` 走 `runArtifactShortcut` → create_card_artifact 工具，产出真实 artifact 落到「你创建的」
- 当前唯一 card kind 是 "word"，故每个模板是按分类主题的英语单词 deck；分类即主题
- 产品文案中文，代码/注释英文

## 变更历史

### 2026-06-15 — 创建
- **出发点**：artifacts 页面顶部要有 tabs（你创建的/你收藏的/各分类），新用户空态需要底部展示推荐/热门项目
- **目标**：提供分类与推荐模板的静态目录
- **关键决策**：模板复用既有快捷生成管线（点击即生成真实 artifact），不引入新的"公开 artifact"后端；按分类组织，`recommendedForYou` 取各分类首个保证空态多样性
