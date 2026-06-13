# src/components/layout/FloatingControls.tsx

## Responsibility
Floating corner buttons replacing a fixed header: top-left (when the sidebar is collapsed) the panel-toggle that *pins* the sidebar open, plus back-to-chat on the Today page; top-right notification bell. While collapsed it also renders a wide left-edge reveal zone (`.nb-edge-reveal`) — hovering the screen's left edge fades in a soft glow and clicking anywhere in the strip *peeks* the sidebar open temporarily (overlay that auto-closes on pointer leave), distinct from the panel icon which pins it.

## Dependencies
- Upstream: store, icons
- Downstream: App

## Change history

### 2026-06-13 — edge reveal peeks temporarily, panel icon pins
- **Motivation**: clicking the left-edge glow expanded the sidebar permanently,
  same as the panel icon — there was no lightweight "just take a quick look"
  affordance, so users had to re-collapse afterwards.
- **Goal**: split the two triggers. The wide edge strip now calls `peekSidebar()`
  → a temporary overlay that auto-closes when the pointer leaves the rail; only
  the dedicated panel-toggle icon (`setSideCollapsed(false)`) pins it open.
- **Change**: edge-reveal `onClick` → `peekSidebar`; titles updated to
  「临时展开边栏」(edge) vs「固定展开边栏」(icon).

### 2026-06-13 — left-edge reveal zone for the collapsed sidebar
- **Motivation**: users had to aim precisely for the small top-left toggle to
  reopen the sidebar.
- **Goal**: hovering anywhere along the left screen edge shows a glow hinting at
  the affordance, and clicking the (deliberately wide, 28px) hit area expands the
  sidebar — no need to target the toggle button.

### 2026-06-13 — remove the read/unread feature
- **Motivation**: user asked to drop read-state management entirely.
- **Change**: removed the amber unread dots from the expand-sidebar button and the notification bell.

### 2026-06-12 — created
- **Motivation**: user iteration "尽量让可视区域最大化…不要有固定的 header" — chrome becomes translucent corner buttons.

### 2026-06-12 — expand-task-rail button removed
- **Motivation**: the right task rail no longer exists (tasks moved to the
  sidebar "任务" entry + full-page TasksView), so its expand control and the
  topic task count became dead UI.

### 2026-06-12 — top-left controls only when the sidebar is collapsed
- **Motivation**: the Today page now keeps the sidebar, so the permanent
  back-to-chat float there became redundant chrome.
- **Goal**: the top-left float appears only in collapsed (immersive) mode:
  expand-sidebar always, plus back-to-chat while on the Today page so one
  click leaves reading without re-expanding the sidebar.
