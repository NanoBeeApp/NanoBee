# src/components/layout/FloatingControls.tsx

## Responsibility
Floating corner buttons replacing a fixed header: top-left back-to-chat (Today) or expand-sidebar (with unread dot); top-right notification bell and expand-task-rail (with topic task count).

## Dependencies
- Upstream: store, topics, icons
- Downstream: App

## Change history

### 2026-06-12 — created
- **Motivation**: user iteration "尽量让可视区域最大化…不要有固定的 header" — chrome becomes translucent corner buttons.
