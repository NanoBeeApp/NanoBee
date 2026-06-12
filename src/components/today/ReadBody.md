# src/components/today/ReadBody.tsx

## Responsibility
Expanded body of a Today item: paragraphs + bullet lists, source line, and the action row (打开对话 / 标为已读·未读 / topic badge). Shared by list and card views.

## Key exports
`ReadBody`, `ReadItemActions` (shared action props type).

## Dependencies
- Upstream: types (UpdateItem), topics, icons
- Downstream: ReadRow, ReadCard

## Change history

### 2026-06-12 — created
- **Motivation**: list and card views expand to identical content; extracting removed the prototype's duplication.
