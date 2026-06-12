# src/App.tsx

## Responsibility
App shell: three-column grid (sidebar | center | task rail) with collapse states, chat/today view switching, global overlays (notification dropdown, quick chat, selection float, toasts) and the ⌘N new-chat shortcut.

## Key exports
`App` (default).

## Dependencies
- Upstream: store/useAppStore, all top-level components
- Downstream: src/main.tsx

## Key notes
- The Today page collapses both side columns (immersive reading), matching the design's "no fixed header, maximize content" iteration.
- Grid classes `rail-collapsed` / `side-collapsed` drive explicit grid-column sizing in app.css (prototype fixed a 0-width chat bug this way).

## Change history

### 2026-06-12 — created
- **Motivation**: implement the approved NanoBee design (chat home + Today reading page + global quick chat) from the Claude Design handoff bundle.
- **Decision**: view state lives in the store ('chat' | 'today') rather than a URL router — matches the prototype's stateful navigation; routing can be added when real persistence lands.
