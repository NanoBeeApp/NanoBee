# artifacts/recommended.ts

## Responsibility
Static directory for the Artifacts browsing experience: category tabs (Finance / Tech / Developer / Business / Travel / Academic / Lifestyle) plus recommended templates under each category. Also used for the "Recommended for you" section at the bottom of the empty-state views for `你创建的` (Your creations) and `你收藏的` (Your favorites). Pure content — no generation logic.

## Core exports / API
- `ArtifactCategory` / `RecommendedTemplate`: types
- `ARTIFACT_CATEGORIES`: ordered array of categories (tab order); `id` is the URL `tab` value
- `RECOMMENDED_TEMPLATES`: all recommended templates
- `templatesForCategory(id)`: returns templates for a given category
- `recommendedForYou(limit=6)`: cross-category "Recommended for you" (takes the first template from each category)
- `categoryLabel(id)`: category id → display label

## Dependencies
- Upstream: `types.ts` (IconName)
- Downstream: `components/artifacts/*` (tab bar, gallery, recommendation cards)

## Key implementation notes
- Each template is a seed for a one-tap generation: clicking it runs `runArtifactShortcut` → `create_card_artifact` tool, producing a real artifact that lands under Your creations
- The current only card kind is `"word"`, so every template is an English vocabulary deck themed around its category
- Product copy is in Chinese; code and comments are in English

## Change history

### 2026-06-15 — Created
- **Motivation**: the artifacts page needs tabs at the top (`你創建的` / `你收藏的` / per-category), and new users in the empty state need a "recommended / popular" section at the bottom
- **Goal**: provide a static directory of categories and recommended templates
- **Key decisions**: templates reuse the existing shortcut-generation pipeline (clicking creates a real artifact immediately, no new "public artifacts" backend); organized by category; `recommendedForYou` takes the first template from each category to guarantee variety in the empty state
