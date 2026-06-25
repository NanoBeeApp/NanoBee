# __root.tsx

## Responsibility
Root document for all routes: HTML shell, NanoBee meta tags, favicon, the
design-system stylesheet chain (tokens → base → app) and the shared
QueryClientProvider.

## Dependencies
- Upstream: `@tanstack/react-router`, `@tanstack/react-query`,
  `@/lib/queryClient`, `src/styles/**` CSS
- Downstream: every route

## Notes
- Children render inside `<div id="root">` because the prototype CSS targets
  the `#root` selector (full-height app grid).
- Stylesheet order matters; do not reorder the links.

## Change history

### 2026-06-26 — favicon switched to the V3 bee-in-flight logo
- **Motivation**: the brand logo was redesigned from scratch (V3, a dynamic
  bee-in-flight with a motion trail and crisp AI sparkle stars). The favicon must
  reflect the new mark, and the old hand-coded `public/favicon.svg` (static
  front-facing bee) was removed.
- **Changes**: replaced the single `image/svg+xml` favicon link with PNG icon
  links pointing at the new brand assets (`/brand/nanobee-logo-32.png`,
  `/brand/nanobee-logo-64.png`) plus an `apple-touch-icon`
  (`/brand/nanobee-logo-256.png`). The new icon stays legible down to 32px
  (verified in the logo review). `public/sw.js` notification icon/badge were
  repointed to the same brand PNGs in the same change.

### 2026-06-15 — global error boundary + mobile CSS
- **Motivation**: a crashed React subtree left a blank white screen; mobile devices
  got an unusable overflowing two-column layout.
- **Changes**:
  - Wraps `{children}` with `<ErrorBoundary>` (from `src/components/common/ErrorBoundary.tsx`)
    as the root-level catch-all for any uncaught render error.
  - Adds `mobile.css` as the last stylesheet link (after `app.css`) so the
    mobile overrides win on specificity; load order mirrors the "tokens → base →
    app → mobile" chain documented in the link list.

### 2026-06-15 — mount LocaleProvider for i18n
- **Motivation**: Phase 1 i18n foundation requires a React context that wraps the
  whole tree so `useT()` and `useLocale()` work from any component.
- **Changes**: imports `LocaleProvider` from `@/lib/i18n/LocaleContext` and wraps
  the `ErrorBoundary` + `{children}` subtree inside it. `LocaleProvider` reads the
  persisted locale from localStorage on mount (default "zh"); the choice is live for
  the whole session and survives reload.

### 2026-06-12 — created
- **Motivation**: integrate the client-side prototype (built in a parallel
  session from the approved design) into the TanStack Start template, which
  renders the document via this root route instead of index.html.
- **Key decision**: dropped the template's auth/session beforeLoad and Toaster
  (no auth yet; the prototype ships its own ToastStack).
