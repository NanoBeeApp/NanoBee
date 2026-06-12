# src/components/common/Toggle.tsx

## Responsibility
On/off switch using the design system's .toggle classes; stops click propagation so it can sit inside clickable rows.

## Dependencies
- Downstream: TaskCard, TodayView (auto-read menu row)

## Change history

### 2026-06-12 — created
- **Motivation**: shared by task cards and the Today "more" menu; extracted per one-component-per-file convention.
