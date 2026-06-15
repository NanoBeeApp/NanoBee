# DataViewDetail.tsx

Detail surface for a data view (kind='data_view'). Header (title + refresh /
favorite / delete) + source/filter sub-header + non-blocking PipelineStatusBar +
a view switch (list / card / table / timeline) over the fetched item stream.
Polls the store (loadArtifacts) every 2s while the pipeline is in progress and
re-fetches items via `GET /api/artifacts/:id/items` as they land. Refresh hits
`POST /api/artifacts/:id/refresh`. P1 implements list + card; table/timeline show
a placeholder. View mode is local state (seeded from the view's defaultView).

## 变更历史与出发点
- 2026-06-15 新建（P1）。取代旧 word-deck 详情对 data_view 的渲染（ArtifactDetail 按 kind 分支）。
  视觉对齐 V2 设计稿（private/design/nanobee-data-views-agy-v2.html）。
