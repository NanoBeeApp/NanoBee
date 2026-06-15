# components/chat/ArtifactRefCard.tsx

## Responsibility
A reference card in chat for a generated artifact. When an agent creates a card deck during a reply, this card renders below the AI message; clicking it opens the Artifacts page and focuses that artifact (the deck renders there, keeping the chat feed lightweight).

## Core exports / API
- `ArtifactRefCard({ refs })`

## Dependencies
- Upstream: `store/useAppStore.ts` (openArtifacts), `icons/icons.tsx`, `artifacts/types.ts` (ArtifactRef)
- Downstream: `components/chat/MessageView.tsx` (rendered when an AI message carries artifacts)

## Key implementation notes
- Pure display plus a single `openArtifacts(id)` navigation action.
- The full card deck is not rendered inline — avoids making the chat feed too heavy.

## Change history

### 2026-06-13 — created
- **Motivation**: after chat triggers artifact generation, the conversation needs a clickable entry point to the produced artifact.
- **Goal**: a lightweight reference card that jumps to the corresponding item on the Artifacts page when clicked.
- **Key decision**: chat holds only the reference, not the full card deck; navigation reuses `store.openArtifacts`.
