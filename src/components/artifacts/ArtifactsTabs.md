# ArtifactsTabs

Top tab bar for the Artifacts (数据视图) page: the two personal tabs (你创建的 /
你收藏的) followed by the browse categories (科技 / 开发者 / 财经 / 新闻 / 生活).
Pure render — the active tab + change handler come from the parent
(`ArtifactsView` via `useArtifactsUrlSync`); the value is the URL `tab` param.

## Change history & motivation
- 2026-06-17 — Restyled from `nb-arti-tab` to the design's `af-tab` chrome
  (underline-active, soft-tinted). Structure unchanged.
