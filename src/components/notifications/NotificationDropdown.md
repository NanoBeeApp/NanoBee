# src/components/notifications/NotificationDropdown.tsx

## Responsibility
Bell dropdown: 4 most recent proactive updates (icon, title, truncated summary, time) + "查看全部" → Today page. Backed by a scrim for outside-click close.

## Dependencies
- Upstream: store, icons
- Downstream: App (rendered when notifOpen)

## Change history

### 2026-06-12 — created
- **Motivation**: third touchpoint for proactive pushes (sidebar entry + in-chat cards + bell), per the design.
