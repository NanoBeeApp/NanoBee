# mobile.css

## Responsibility
Mobile-responsive overrides for the NanoBee app shell at `<= 768px` (phones
and small tablets in portrait orientation). Loaded after `app.css` so all rules
override desktop defaults.

## What it covers
| Section | Behaviour |
|---------|-----------|
| Error boundary | `.nb-error-*` classes shared across all viewports (defined here, not in app.css) |
| Mobile header | `.nb-mobile-header` + hamburger — visible only on mobile |
| App grid | Overrides the two-column CSS Grid to a single-column flex-column shell |
| Sidebar drawer | `.nb-side` is `position:fixed; transform:translateX(-100%)` by default; `.nb-app.mobile-nav-open .nb-side` slides it in; a scrim `.nb-drawer-scrim` covers the content |
| Content area | `.nb-chat` goes full-width; floating desktop controls (`.nb-float`) are hidden |
| Chat / compose | Tighter horizontal padding; iOS safe-area bottom inset for the composer |
| Today | Single-column read grid; slimmer inner padding |
| Tasks | Single-column task grid; task detail drawer becomes a bottom sheet |
| Settings | AI split collapses to single column |
| Compare | Columns allow horizontal scroll |
| Notifications | Full-width bottom sheet |
| Modals | Bottom-sheet pattern |
| Touch targets | Nav tiles enforce `min-height: 44px` |
| Extra-small (<375px) | Nav grid becomes a single column |

## Dependencies
- Imported in `__root.tsx` after `app.css` (load order matters).
- Uses only existing Radix / NanoBee CSS custom properties — no new hex values.
- The mobile nav-open toggle is driven by `AppLayout` in `_app.tsx` which adds
  the `mobile-nav-open` class to `.nb-app`.

## Change history

### 2026-06-15 — created
- **Motivation**: the two-column shell had no mobile breakpoint; on phone-width
  viewports the sidebar overflowed and the layout was unusable.
- **Approach**: off-canvas drawer pattern (sidebar slides in over content),
  mobile header with hamburger, content fills remaining space. No new npm deps.
- Error boundary styles are co-located here since they are layout-level and also
  referenced by the new `ErrorBoundary` component.
