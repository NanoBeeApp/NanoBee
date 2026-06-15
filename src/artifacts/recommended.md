# artifacts/recommended.ts

## Responsibility
Static directory for the Artifacts browsing experience: category tabs (Finance / Tech / Developer / Business / Travel / Academic / Lifestyle) plus recommended templates under each category. Also used for the "Recommended for you" section at the bottom of the empty-state views for `你创建的` (Your creations) and `你收藏的` (Your favorites). Pure content — no generation logic.

## Core exports / API
- `ArtifactCategory` / `RecommendedTemplate`: types
- `ARTIFACT_CATEGORIES`: ordered array of categories (tab order); `id` is the URL `tab` value
- `RECOMMENDED_TEMPLATES`: all recommended templates
- `templatesForCategory(id)`: returns templates for a given category
- `recommendedForYou(limit=6)`: cross-category "Recommended for you" (takes the first template from each category)
- `categoryLabel(id)`: category id → display label

## Dependencies
- Upstream: `types.ts` (IconName)
- Downstream: `components/artifacts/*` (tab bar, gallery, recommendation cards)

## Key implementation notes
- Each template is a one-tap seed: clicking it runs `runArtifactShortcut` → the chat agent's `create_data_view` tool, producing a real data view that lands under Your creations
- Categories are 科技 / 开发者 / 财经 / 新闻 / 生活 (aligned to the V2 design); every template prompt asks the agent to create a data view over a public source
- Product copy is in Chinese; code and comments are in English

## Change history

### 2026-06-15 — Created
- **Motivation**: the artifacts page needs tabs at the top (`你創建的` / `你收藏的` / per-category), and new users in the empty state need a "recommended / popular" section at the bottom
- **Goal**: provide a static directory of categories and recommended templates
- **Key decisions**: templates reuse the existing shortcut-generation pipeline (clicking creates a real artifact immediately, no new "public artifacts" backend); organized by category; `recommendedForYou` takes the first template from each category to guarantee variety in the empty state

### 2026-06-15 — 纠偏为数据视图模板（P1）
- **Motivation**: Artifacts 纠偏为「聊天生成数据视图」，模板不再是背单词卡组
- **Goal**: 分类改为 科技/开发者/财经/新闻/生活；模板 prompt 改为请求创建数据视图（如「只看 AI 相关的 Hacker News」）
- **Key decisions**: 仍复用 `runArtifactShortcut`，但触发的是 `create_data_view` 工具；prompt 用自然语言描述关注口径，由 agent 选 source + topic
