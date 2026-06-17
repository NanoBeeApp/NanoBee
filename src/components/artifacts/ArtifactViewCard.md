# ArtifactViewCard

One owned card in the gallery grid ("你创建的" / "你收藏的"). Renders a data view
(source badge + filter口径 + item count / pipeline status chip) or a legacy word
deck (card count). The whole card opens the detail; the star toggles favorite and
the × deletes (both stop propagation). Disabled while the view is still building.

## Change history & motivation
- 2026-06-17 — Created for the design rebuild, replacing the old `ArtifactCard` /
  `ArtifactRow`. Uses the design's `af-vcard` markup and the per-source styling
  from `afMeta`.
