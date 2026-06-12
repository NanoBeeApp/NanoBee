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

### 2026-06-12 — created
- **Motivation**: integrate the client-side prototype (built in a parallel
  session from the approved design) into the TanStack Start template, which
  renders the document via this root route instead of index.html.
- **Key decision**: dropped the template's auth/session beforeLoad and Toaster
  (no auth yet; the prototype ships its own ToastStack).
