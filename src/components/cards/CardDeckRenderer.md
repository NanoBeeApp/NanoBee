# components/cards/CardDeckRenderer.tsx

## 文件职责
Deck 渲染器——把 deck 的 `kind` 映射到对应渲染器的唯一 switch 点。这是动态卡片功能的通用接缝：新增数据类型只需在此加一个 case + 对应的 item 组件，视图与生成管线均无需改动。

## 核心导出 / API
- `CardDeckRenderer({ deck })`

## 依赖关系
- 上游：`cards/types.ts`、`components/cards/WordCardItem.tsx`
- 下游：`components/cards/CardsView.tsx`

## 关键实现思路
- 按 `deck.kind` switch；word 用网格布局渲染 WordCardItem
- default 返回 null，保持 switch 在新增 kind 时显式

## 变更历史

### 2026-06-13 — 创建
- **出发点**：需要一个集中点决定"这种 kind 用哪种卡片样式"
- **目标**：让卡片样式按数据类型可插拔
- **关键决策**：单一 switch 接缝而非在视图里散落条件，扩展只动这一处
