# task-templates.ts

Static catalog powering the Task Template Library picker on the Tasks home screen.

## Purpose

Provides:
- `TEMPLATE_CATEGORIES` — the three browse tabs (价格监控, 资讯推送, 定时提醒).
- `TASK_TEMPLATES` — 10 templates whose `triggerSpec` is ready for `POST /api/tasks` with no LLM round-trip.
- Helper functions: `templatesForCategory`, `featuredTemplates`, `interpolate`, `applyParams`, `buildTriggerLabel`.

Templates marked `comingSoon: true` are grayed out in the picker until their data-hub source ships. All currently live templates use only `gold`, `hackernews`, or `websearch` — the three verified data-hub sources.

## Template param substitution

Templates with fillable parameters carry a `params` array. Before creation, the picker calls `applyParams(spec, values)` which replaces `{{key}}` tokens in `messageTemplate`, `label`, `message`, `params.query`, etc. Numeric fields (`hour`, `minute`, `threshold`) are coerced with `Number()`.

## Change history

| Date       | Change |
|------------|--------|
| 2026-06-15 | Initial catalog: 3 categories, 10 live templates (3 monitor, 4 news-ish, 3 schedule). No coming-soon templates in initial ship. |
| 2026-06-15 | Bug fixes: (1) All three gold templates changed `metric: 'price'` → `metric: 'items[0].xauUsdPerOz'` to match the actual field name returned by the data-hub gold source. (2) `tpl_hn_spike` threshold lowered from 10 to 25 and `params: { limit: 30 }` added so the hub returns enough items for the condition to ever fire. (3) `tpl_weekly_review` marked `comingSoon: true` because `ScheduleTrigger` has no weekday field — the engine would fire daily not weekly, breaking the promise. |
