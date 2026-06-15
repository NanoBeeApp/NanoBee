# worker/agent/card-artifact-tools.ts

## Responsibility
The `create_card_artifact` agent tool — the **chat entry point** for the dynamic cards feature. When a chat message requests viewing or studying a set of data (currently English vocabulary), the model calls this tool: it generates a card deck and persists it as an artifact. The tool's value lies in its side effect (the saved artifact appears on the Artifacts page); the string returned to the model is just a confirmation.

## Core exports / API
- `cardArtifactTools(ctx)`: returns `[create_card_artifact]` when `ctx` carries an artifact context; otherwise returns `[]`

## Dependencies
- Upstream: `ai/settings.ts` (resolveAiConfig), `cards/generate.ts`, `artifacts/repo.ts`, `cards/prompt.ts`, `agent/tools.ts` (AgentContext / AgentTool)
- Downstream: `agent/tools.ts` (`collectAgentTools` collects this)

## Key implementation notes
- Reuses the per-user AI configuration from the current request (same provider as chat)
- After generation, pushes an `ArtifactRef` onto `ctx.artifacts.created`; `messages.ts` attaches it to the AI reply so the card is clickable inside the chat
- Sets `timeoutMs: 90_000` because generation involves an LLM call, far exceeding the default 20-second tool timeout
- Only exposed when the request provides an artifact context; unauthenticated / anon flows are still supported

## Change history

### 2026-06-13 — Created
- **Motivation**: cards were required to be triggered by a chat message rather than a standalone input page
- **Goal**: wrap card generation as an agent tool so it integrates naturally into conversation
- **Key decisions**: tool persists the artifact as a side effect and passes the reference back to the request handler via `AgentContext`; ships with a long timeout built in
