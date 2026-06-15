# TaskComposer.tsx

## Responsibility
The single visual focus of the Tasks home screen: one quiet chat-style input that
turns a sentence into an automated task. Submitting hands the text to the chat
pipeline (`store.send`), where the agent proposes a task the user confirms — tasks
are born from conversation, not a config form. The purple send button is the only
accent-colored block on the home screen. Below sit two low-weight secondary
entries (batch upload / template).

## Dependencies
- Upstream: `useAppStore` (`send`), `Icons`
- Downstream: TasksHome

## Key implementation notes
- IME guard (`composingRef`) prevents an Enter that commits a composition from submitting.

## Change history

### 2026-06-15 — Created
- **Motivation**: The home screen needs exactly one focus — a create input — with complex entries kept low-weight.
- **Goal**: A calm single-line composer that reuses the existing chat send pipeline so no new task-creation backend is needed.
