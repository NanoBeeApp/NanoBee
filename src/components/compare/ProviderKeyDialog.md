# src/components/compare/ProviderKeyDialog.tsx

## Responsibility
Modal to manage per-provider API keys for the compare page. Lists every provider
with status (built-in / configured / not set); each row expands to an inline key
(+ host for custom) form. Only masked status is shown, never the raw key.

## Props
`{ onClose }` — all data + actions come from `useCompareStore`.

## Relationships
- Upstream: `useCompareStore` (`providers`, `configured`, `signedIn`,
  `saveProviderKey`, `deleteProviderKey`), `useAppStore` (`toast`),
  `lib/compare-models` (`PROVIDER_DOT`), `icons/icons`.
- Backend: `PUT /api/compare/keys`, `DELETE /api/compare/keys/:provider`.
- Opened by: `CompareView` (from the column picker's "配置 API Key" + needs-key
  column states).

## Notes
- Requires sign-in to save (endpoints are authed); signed-out users see a note and
  can still use OpenRouter's built-in models.
- Minimal chrome (floating close, no footer bar) per the UI "maximize content" rule.

## Change history
### 2026-06-15 — Created
- Reason: cross-provider compare needs a place to add one key per provider.
- Goal: a compact, in-page key manager that never surfaces raw keys.

### 2026-06-15 — English-only strings
- Reason: public-repo rule — all UI copy must be in English.
- Change: all status badges, prompts, toast messages, button labels and notes
  translated to English (Configured / Built-in / Not set; Save / Delete; etc.).
