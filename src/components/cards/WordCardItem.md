# components/cards/WordCardItem.tsx

## 文件职责
单个"单词"卡片的渲染器。纯展示组件：顶部 word + 音标 + 词性，中文释义作为醒目主义项，英文释义，带翻译的例句，可选近义词与记忆法。当前仅展示，交互(翻面/标记已掌握/发音)后续再加。

## 核心导出 / API
- `WordCardItem({ card, index })`

## 依赖关系
- 上游：`icons/icons.tsx`、`cards/types.ts`(WordCard)
- 下游：`components/cards/CardDeckRenderer.tsx`

## 关键实现思路
- 纯渲染、无状态，接 props
- 样式类在 `styles/cards.css`(.nb-wordcard*)
- 每张卡与子区域带业务化 data-testid(word-card-{i} 等)

## 变更历史

### 2026-06-13 — 创建
- **出发点**：单词数据需要专属卡片样式(不同数据不同样式的首个落地)
- **目标**：清晰承载音标/释义/例句/记忆法的信息层级
- **关键决策**：中文释义提为主义项视觉权重最高，英文释义次之，例句用浅底块区分
