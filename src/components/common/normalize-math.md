# normalize-math.ts

## Responsibility
Normalises AI-emitted math delimiters before they reach `remark-math`. Converts
TeX-style `\( … \)` (inline) and `\[ … \]` (block) into the dollar forms
(`$ … $` / `$$ … $$`) that remark-math v6 actually parses, and promotes inline
`$$ … $$` into standalone display blocks. Fenced code blocks and inline code are
left untouched so example code is never corrupted.

## Core exports / API
- `normalizeMathDelimiters(input: string): string` — pure string transform, safe
  on empty input.

## Dependencies
- Upstream: none (pure function, no imports).
- Downstream: `Markdown.tsx` calls it on every markdown string before handing the
  content to `ReactMarkdown` + `remark-math` + `rehype-katex`.

## Key implementation notes
- Two-pass split: first isolate fenced blocks (```` ``` ````/`~~~`), then within
  each non-fence fragment a single regex matches inline code OR the three math
  delimiter forms, returning inline code verbatim.
- Ported 1:1 (logic) from the Curve project's `core/markdown/normalize-math.ts`;
  comments rewritten in English per the public-repo language rule.

## 变更历史

### 2026-06-13 — 创建
- **出发点**：用户要求聊天/阅读的 markdown 显示参考 curve 的代码，curve 的
  react-markdown 渲染链路依赖这一步预处理来正确显示数学公式。
- **目标**：把 curve 的数学分隔符归一化逻辑带进 NanoBee，供公共 Markdown 组件复用。
- **关键决策**：与 Markdown 组件同目录（`components/common/`）放置，而非新建
  `src/core/` 顶层目录，保持 markdown 渲染相关代码聚合在一处。
