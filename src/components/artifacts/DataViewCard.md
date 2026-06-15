# DataViewCard.tsx

One item rendered as a card in a data view's card pane. P1 built-in default
template that adapts to whichever fields the item has (title always; optional
author avatar, summary, and a metric row of points/comments/time, + 阅读原文
link). Pure render. AI-generated per-shape templates are P3; this is the safe
fallback the renderer always has.

## 变更历史与出发点
- 2026-06-15 新建（P1）。体现「按数据字段动态展示」——字段缺省即不渲染对应块。
