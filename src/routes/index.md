# index.tsx

## Responsibility
Home route — mounts the NanoBee app shell (`src/App.tsx`).

## Notes
`ssr: false`: the app is fully interactive/state-driven with window listeners;
client-only rendering avoids SSR/hydration pitfalls with no SEO downside.

## Change history

### 2026-06-12 — created
- **Motivation**: replace the SPA entry (index.html + main.tsx) with a
  file-based route so the prototype runs inside the full-stack template.
