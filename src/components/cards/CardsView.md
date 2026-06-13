# components/cards/CardsView.tsx

## 文件职责
动态卡片视图——应用核心界面：选择想看的数据类型，可选给主题，AI 即生成该类型专属布局的卡片 deck。当前单词 kind 已端到端打通；kind 选择器是未来数据类型(Hacker News、股票、天气…)的扩展点。当前仅展示、无逐卡交互。

## 核心导出 / API
- `CardsView()`

## 依赖关系
- 上游：`icons/icons.tsx`、`cards/types.ts`、`components/cards/useCardDeck.ts`、`components/cards/CardDeckRenderer.tsx`
- 下游：`App.tsx`(view === 'cards' 时渲染)

## 关键实现思路
- 客户端维护轻量 KIND_CATALOG(仅展示元信息；prompt 在服务端)，避免把 prompt 文本打进前端 bundle
- 状态走 useCardDeck hook，视图保持渲染为主
- 顶部 chrome 精简、白底，最大化卡片区(UI 铁律)
- 空/加载/错误/有 deck 四态

## 变更历史

### 2026-06-13 — 创建
- **出发点**：用户要"想看哪个数据就生成对应卡片"的核心界面，先走通单词
- **目标**：kind 选择 + 主题输入 + 生成 + 分态展示的完整闭环
- **关键决策**：kind 目录前端只放展示元信息，生成 prompt 全留服务端；deck 标题/副标题 + 网格渲染
