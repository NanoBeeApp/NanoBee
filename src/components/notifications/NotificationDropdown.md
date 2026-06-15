# src/components/notifications/NotificationDropdown.tsx

## Responsibility
Bell dropdown: 4 most recent proactive updates (icon, title, truncated summary, time) + "查看全部" (View All) → Today page. Backed by a scrim for outside-click close.

## Dependencies
- Upstream: store, icons
- Downstream: App (rendered when notifOpen)

## Change history

### 2026-06-12 — created
- **Motivation**: third touchpoint for proactive pushes (sidebar entry + in-chat cards + bell), per the design.

### 2026-06-15 — add empty state when there are no updates
- **Motivation**: remove all demo/seed data and hardcoded fixed data so the app starts empty; the dropdown previously always had items (seeded demo updates), so an empty state was never needed. With a real empty DB, the list renders nothing — a blank dropdown looked broken.
- Added a `.nb-notif-empty` div ("暂时没有新动态" — no new updates yet) shown when `updates.length === 0`.
- The `updates.slice(0, MAX_ITEMS).map(...)` list renders unchanged for non-empty state.
