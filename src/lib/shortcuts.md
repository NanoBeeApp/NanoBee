# lib/shortcuts.ts

## File responsibility
Static definitions and pure helpers for the app's keyboard shortcuts. Owns the
list of user-configurable single-key shortcuts (their ids, labels, defaults),
the read-only list of fixed reference shortcuts, and the key normalization /
formatting / event-matching helpers shared by the global handler and the
settings UI. The live (possibly user-overridden) bindings live in
`store/useShortcuts.ts`.

## Core exports / API
- `ShortcutId` — `'toggleLeftSidebar' | 'toggleRightSidebar'`.
- `ShortcutDef`, `SHORTCUT_DEFS` — the configurable shortcuts in display order.
- `DEFAULT_BINDINGS: Record<ShortcutId, string>` — id → default key.
- `FixedShortcut`, `FIXED_SHORTCUTS` — non-editable reference shortcuts (⌘N / ⌘J / Esc).
- `normalizeKey(raw)` — canonicalize to a single uppercase A–Z/0–9 char, or null.
- `formatKey(key)` — display form of a binding.
- `eventMatchesBinding(e, binding)` — true when a bare keypress matches the binding
  (rejects Ctrl/Meta/Alt; Shift allowed).
- `isEditableTarget(el)` — true for inputs/textareas/selects/contentEditable, where
  bare-key shortcuts must stand down.

## Dependencies
- Upstream: none (pure module).
- Downstream: `store/useShortcuts.ts`, `routes/_app.tsx` (global handler),
  `components/settings/ShortcutsSection.tsx` (settings UI).

## Key implementation notes
- Bindings are deliberately modifier-free single keys ("press S" / "press D");
  safety comes from the global handler ignoring editable targets and IME
  composition, plus `eventMatchesBinding` rejecting Ctrl/Meta/Alt.
- Only letters and digits are accepted as bindings, keeping rebinding predictable
  and avoiding punctuation / dead keys / IME edge cases.

## Change history

### 2026-06-18 — Created
- **Motivation**: back the new global S/D sidebar toggles and the configurable
  Settings → Shortcuts panel with shared definitions + matching helpers.
- **Key decision**: keep definitions/helpers pure here and the mutable bindings in
  a separate localStorage-backed store (mirrors `research/styles.ts` +
  `store/useResearchPrefs.ts`).
