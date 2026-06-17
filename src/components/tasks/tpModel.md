# tpModel

Maps a real domain `Task` onto the Tasks-page view-model (`TaskVM`) the design
components consume, plus the page's shared constants (`TP_STAT`, `TP_RUN`,
`TP_SUGGEST`, `toneColor`) and the `featuredTasks` selector.

## Why
Keeping all field derivation in one place (status → attention, kind → type /
typeLabel, batch → children, payload-carried enrichment → drawer fields) means
the row / card / table / kanban / drawer renderers stay pure and read from a
single source. Every field is derived with graceful fallbacks, so the page works
on the plain seed tasks and lights up its richer states (monitor card, failure
block, run history) whenever a task's payload carries them.

## Change history & motivation
- 2026-06-17 — Created for the design rebuild, replacing the old `taskMeta.ts`
  (statusLabel / statusTone / taskKind). Adds the full view-model mapping and the
  featured-strip selector.
