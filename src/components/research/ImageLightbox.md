# components/research/ImageLightbox.tsx

## File responsibility
Fullscreen image zoom for images inside a research article. Opens the clicked
image at full size over a dimmed backdrop; click anywhere or press Escape to
close. Renders nothing while closed.

## Core exports / API
- `ImageLightbox({ src, onClose })` — `src: string | null` (null → not rendered).

## Dependencies
- Upstream: `icons/icons.tsx`.
- Downstream: `components/research/ReadingOverlay.tsx` (owns the `src` state and
  passes `onOpenImage={setLightboxSrc}` to the article `<Markdown>`).

## Key implementation notes
- The shared `<Markdown>` component already turns images into `.md-img-btn`
  buttons when given `onOpenImage`; this component is just the viewer surface.
- Backdrop click closes (cursor: zoom-out); the `<img>` stops propagation so
  clicking the image itself doesn't close. Escape is bound only while open.

## Change history

### 2026-06-14 — Created
- **Motivation**: the reading overlay never passed `onOpenImage` to `<Markdown>`,
  so article images couldn't be opened full-size (Curve had a lightbox).
- **Goal**: restore click-to-zoom for article images.
- **Key decision**: a tiny standalone viewer component; the overlay owns the
  open `src` so closing on node-change is trivial.
