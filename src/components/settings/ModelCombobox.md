# src/components/settings/ModelCombobox.tsx

## Responsibility
Editable model-id combobox for the AI settings pane: a single text field (typed
custom id doubles as a type-ahead filter) plus a chevron that opens a filterable
popover of the provider's auto-fetched model ids. Single source of truth for the
value — no parallel `<select>` + `<input>` pair.

## Core exports
- `ModelCombobox(props)` — `{ value, models, loading, canList, placeholder, onChange }`.

## Dependencies
- Upstream: `@/icons/icons`.
- Downstream: `components/settings/AiSettingsForm.tsx` (AI model pane).

## Key notes
- Keyboard nav (↑/↓/Enter/Esc), selected-row check mark, auto-scroll-into-view,
  outside-click close, and empty/loading/no-match popover states are local.
- The chevron + popover only render when `canList` (provider supports listing).
- Styles live in `app.css` as `.nb-modelcb-*`.

## Change history

### 2026-06-18 — Extracted from AiSettingsForm.tsx
- **Motivation**: the settings page moved to a 3-column layout and AiSettingsForm
  grew several panes; the self-contained combobox was pulled into its own file
  to keep that component focused. Behavior unchanged from the inline version.
