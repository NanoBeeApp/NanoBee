# cards/types.ts

## 文件职责
动态卡片功能的共享领域类型。定义应用核心理念的数据结构：用户说出想看的数据类型，AI 生成对应样式的卡片"牌组"(deck)。框架通用，每种 `kind` 插入自己的卡片形状、prompt 与渲染器。

## 核心导出 / API
- `CardKind`：已注册的卡片种类联合类型(当前仅 `'word'`)
- `WordCard`：单词卡片字段(word/phonetic/partOfSpeech/definition/translation/example/exampleTranslation/synonyms/mnemonic)
- `CardShapeByKind`：kind → 卡片 TS 形状的映射
- `CardDeck<K>`：一次生成的结果(kind + title + subtitle? + cards[] + metadata)
- `CardGenerationInput`：一次生成调用的入参(kind/topic?/count?/locale?)

## 依赖关系
- 上游：无(纯类型)
- 下游：`cards/contract.ts`、`cards/prompt.ts`、`worker/cards/generate.ts`、所有 `components/cards/*`

## 关键实现思路
- 平台无关，worker 与 client 共用
- 通过 `CardShapeByKind` 映射保证 `CardDeck<'word'>.cards` 是 `WordCard[]`，新增 kind 时类型自动收紧

## 变更历史

### 2026-06-13 — 创建
- **出发点**：用户要求"动态卡片生成"为应用核心功能——想看哪个数据就让 AI 生成对应样式卡片，不同数据不同样式；先走通单词卡片
- **目标**：建立可扩展的卡片类型框架，单词卡片为首个落地的 kind
- **关键决策**：用按 kind 区分的判别式结构，而非每种数据写死一套类型；deck 作为统一信封，cards 形状随 kind 变化
