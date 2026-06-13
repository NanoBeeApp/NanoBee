# provider-logos.tsx

## Responsibility
Renders a small colored brand logo tile for each AI provider, used by the
provider picker in the AI settings dialog. Replaces the previous gray
first-letter avatar badge with each provider's real, colored logo.

## Core exports / API
- `ProviderLogo({ id }: { id: AiProviderId })` — a 24px brand-tinted tile
  containing the provider's logo glyph. Color and tint come from an internal
  `BRANDS` map keyed by `AiProviderId`.

## How it works
- Most providers use their official single-path mark (from the simple-icons
  set) filled with the inherited brand color via `currentColor`.
- Google Gemini and Mistral keep their signature multi-color gradients
  (`<linearGradient>` defs embedded in the glyph SVG).
- Providers without a clean single-path mark (Groq, Moonshot Kimi, Zhipu GLM,
  SiliconFlow, Custom) fall back to a brand-colored monogram (`Mono`).

## Dependencies
- Upstream: `AiProviderId` type from `../lib/ai-providers`.
- Downstream: `components/onboarding/AiProviderSetupForm.tsx` renders one per
  provider row. CSS lives in `styles/app.css` (`.nb-ai-prow-logo`).

## Notes
- Trademarks belong to their respective owners; the marks are used only to
  identify the provider in the configuration UI.
- Gradient `id`s are global in SVG; the fixed ids (`nb-logo-gemini`,
  `nb-logo-mistral`) are safe because every instance defines the same gradient.

## Change history

### 2026-06-13 — Created
- **Motivation**: the provider picker showed gray letter badges; the user asked
  for each provider's real, colored logo.
- **Goal**: a single reusable `ProviderLogo` component with authentic, colored
  brand marks and a consistent tile treatment.
- **Key decision**: inline SVG paths (no new dependency, per the project's
  "stay lightweight" rule) instead of pulling in an icon package; brand-colored
  monograms cover the few providers that lack a clean official single-path mark.
