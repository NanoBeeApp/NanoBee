# _app.tsx

## Responsibility
Pathless layout route that owns the whole app shell (sidebar | center surface)
and the global overlay layers (the floating QuickChat widget, notifications,
selection float, toasts). Every in-app page renders into the `<Outlet/>` inside
the center surface, so each view has its own URL while sharing this chrome.
Replaces the former `App.tsx` shell.

## Core exports
- `Route` — `createFileRoute("/_app")` with `ssr: false` (covers the subtree)
  and `component: AppLayout`.

## Dependencies
- Upstream: `@tanstack/react-router` (Outlet / useNavigate / useRouterState),
  `@/store/useAppStore` (+ `viewFromPath`), Sidebar, FloatingControls,
  NotificationDropdown, QuickChat, SelectionFloat, ToastStack.
- Downstream: child routes `_app/index|today|tasks|artifacts|research|settings`.

## Key notes
- **URL is the source of truth for navigation.** A `useLayoutEffect` mirrors the
  active pathname into the store's cached `view` (`syncView(viewFromPath(...))`)
  before paint, so the sidebar active state never lags a deep-link or
  back/forward. The store's view-switching actions navigate via a bridge.
- **navigate bridge**: an effect binds the router's `navigate()` into the store
  (`bindNavigate`) so actions like `openToday` / `selectChat` / `send` change
  the URL. `to` is a plain string cast past the typed-route union.
- The quick chat docks as a collapsible right sidebar (see QuickChat). The shell
  adds `with-rightchat` whenever the sidebar is shown (`withRightChat =
  view !== 'chat' && view !== 'settings'`, mirroring QuickChat's own `hidden`
  guard) and `right-collapsed` when `rightCollapsed` is set — together they
  reserve / drop the grid's third column. On the research canvas the column is
  instead floated as a fixed overlay (app.css) so the canvas stays position-stable.
- `research-canvas` is applied only on the live research canvas
  (`view === 'research' && researchPhase === 'canvas'`). It makes the left rail
  float over a full-width, position-stable canvas (CSS in app.css). Reads
  `useResearchStore.phase` so the shell knows when the canvas is live.
- Hosts the bootstrap effect (load D1 state) and the ⌘N shortcut, which triggers
  the current page's "new" action (`newForView`), matching the sidebar button.

## Change history

### 2026-06-18 — quick chat docks again as a collapsible right sidebar
- **Motivation**: the quick chat moved back from a floating bubble + popup to a
  docked, collapsible right sidebar (see QuickChat), so the shell must reserve
  its grid column again.
- **Change**: re-read `rightCollapsed`; re-added the `withRightChat = view !==
  'chat' && view !== 'settings'` flag and the `with-rightchat` /
  `right-collapsed` classes on `.nb-app`. The grid is `sidebar | content |
  rightchat` when expanded and drops back to two columns when collapsed; on the
  research canvas the rail is floated as an overlay regardless (CSS).

### 2026-06-15 — mobile-responsive pass + error boundary
- **Motivation**: the shell had no mobile breakpoint (sidebar overflowed on phones);
  and any route-level crash had no fallback UI.
- **Changes**:
  - `errorComponent` added to the route definition using `RouteErrorFallback` —
    per-route crash isolation so the shell stays up when one view breaks.
  - `MobileHeader` rendered at the top of the shell (CSS hides it on desktop);
    it owns the hamburger button that toggles `mobileNavOpen` in the store.
  - A `.nb-drawer-scrim` `<div>` renders in the DOM alongside the sidebar; CSS
    makes it visible only when `.mobile-nav-open` is on `.nb-app`. Clicking the
    scrim closes the drawer (`setMobileNavOpen(false)`).
  - `mobileNavOpen` from the store is mapped to the `mobile-nav-open` CSS class
    on `.nb-app`; `mobile.css` slides the sidebar in/out on that class.

### 2026-06-15 — first-run Onboarding overlay
- **Motivation**: new signed-in users with no tasks should see a guided 3-step flow instead of a blank screen.
- **Change**: imports `Onboarding` component and `onboarding.css`; reads `onboardingDone` and `tasks` from the store; renders `<Onboarding />` as a top-level overlay when `!onboardingDone && tasks.length === 0`.

### 2026-06-14 — ⌘N becomes page-aware
- **Motivation**: ⌘N always started a new chat, but the sidebar "new" button now
  adapts to the page; the keyboard shortcut should match.
- **Change**: the keydown handler calls `newForView()` instead of `newChat()`
  (and depends on it), so ⌘N creates a chat / task / artifact / research project
  depending on the active view.

### 2026-06-14 — quick chat floats; drop the reserved grid column
- **Motivation**: the quick chat became a customer-service-style floating
  bubble + popup (see QuickChat), which overlays content instead of docking.
- **Change**: removed the `with-rightchat` class / `withRightChat` flag and the
  `right-collapsed` class (and the `rightCollapsed` read); the grid is back to
  `sidebar | content`, and the widget floats over it.

### 2026-06-14 — research canvas: floating rails
- **Motivation**: on the research canvas, toggling either sidebar resized and
  shifted the canvas (the grid squeezed the center column), so the canvas
  jumped around when the user opened/closed a rail.
- **Goal**: keep the canvas position stable — both rails should float over a
  full-width canvas and never move it.
- **Key decisions**: add a `research-canvas` modifier class on `.nb-app`, gated
  on `view === 'research'` AND `useResearchStore.phase === 'canvas'` (welcome
  phase keeps the normal squeeze layout). The grid logic stays in CSS (single
  full-width column + fixed-overlay rails) rather than inline styles, matching
  the existing `side-peek` float pattern.

### 2026-06-13 — created (extracted from App.tsx)
- **Motivation**: the user wanted every page to have a real URL and the settings
  surface to be a page, not a modal. The app previously switched views via a
  zustand `view` flag on a single `/` route.
- **Goal**: introduce file-based routes per view under one shared layout, with
  the URL as the navigation source of truth.
- **Key decisions**: pathless `_app` layout so all views share the shell while
  each child owns a path; keep the existing components untouched by syncing the
  route → store `view` cache and bridging `navigate()` into the store (so the
  many store actions that switch views keep working without changing call
  sites); `ssr:false` on the layout to keep the interactive subtree client-only.
