# afMeta

Display metadata + small adapters for the Artifacts (数据视图) surface:
- `AF_SOURCES` / `afSource` — per-source badge label/icon/colour (hackernews,
  news, websearch, gold, stocks, …) with a safe fallback.
- `tplForSource` — the card-template kind a source maps to. Real `DataViewItem`s
  are generic (title + summary + meta), so we map only to the `hn` and `news`
  templates that fit; `quote`/`tweet` exist for richer payloads.
- `relTime`, `domainOf`, `itemMetaLine` — helpers turning a `DataViewItem` into
  the fields the card templates / list rows render.

## Change history & motivation
- 2026-06-17 — Created for the design rebuild so the gallery card, detail header
  and every card template read source styling from one place.
