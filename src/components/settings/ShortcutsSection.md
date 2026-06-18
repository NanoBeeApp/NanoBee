# components/settings/ShortcutsSection.tsx

## Responsibility
Keyboard-shortcuts detail pane for the `/settings` master-detail panel. Lists the
user-configurable single-key shortcuts (toggle left / right sidebar) with an
inline rebind capture and per-row reset, plus a read-only list of the built-in
shortcuts (⌘N / ⌘J / Esc) for discoverability.

## Core exports / API
- `ShortcutsSection` — functional component, no props. Rendered as the
  `activePane === 'shortcuts'` detail in `AiSettingsForm`.

## Dependencies
- Upstream: `lib/shortcuts.ts` (`SHORTCUT_DEFS`, `FIXED_SHORTCUTS`, `formatKey`,
  `normalizeKey`, `ShortcutId`), `store/useShortcuts.ts` (bindings + mutators),
  `icons/icons.ts`.
- Downstream: `components/settings/AiSettingsForm.tsx` (renders it).

## Key implementation notes
- **Rebind capture**: clicking a key chip enters capture mode for that shortcut.
  A window keydown listener registered on the **capture phase** grabs the next
  key and calls `e.stopPropagation()`, so the global S/D handler in `_app.tsx`
  (bubble-phase, on window) does NOT also fire while rebinding. Lone modifier
  keys are ignored; `Esc` cancels; a non-letter/digit shows a transient hint.
- Collision handling lives in the store (`setBinding` swaps a clashing shortcut),
  so the UI just calls `setBinding` and re-renders from `bindings`.
- Styling reuses the AI-settings detail classes (`.nb-ai-detail-head`, `.field`,
  `.field-label-row`, `.nb-fetch-models`, `.nb-ai-subhint`) plus shortcut-specific
  `.nb-sc-*` classes in `styles/app.css`.

## Change history

### 2026-06-18 — Created
- **Motivation**: user asked for a Settings panel that displays and lets them
  edit keyboard shortcuts, alongside the new global S/D sidebar toggles.
- **Key decision**: capture-phase listener + `stopPropagation` to keep the
  global handler from firing during a rebind; built-in shortcuts shown read-only
  so the panel is a complete reference, not just the editable pair.
