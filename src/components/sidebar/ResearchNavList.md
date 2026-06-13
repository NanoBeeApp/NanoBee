# src/components/sidebar/ResearchNavList.tsx

## Responsibility
The sidebar scroll-area list shown while the app is on the Research Canvas page.
Lists the user's saved research projects plus a "新研究" shortcut. Clicking a
project loads it onto the canvas; "新研究" returns to the welcome screen.

## Core export / API
- `ResearchNavList()` — self-contained; reads `projects`, `projectId`, `phase`,
  `listProjects`, `loadProject`, `newResearch` from `useResearchStore`.

## Dependencies
- Upstream: `useResearchStore`, icons
- Downstream: `Sidebar` (rendered when `view === 'research'`)

## Key implementation notes
- Calls `listProjects()` on mount so projects saved elsewhere appear (the
  research welcome screen does the same, but the sidebar may mount while the
  store is already in the canvas phase).
- Active row: "新研究" while `phase === 'welcome'`, otherwise the project whose
  id matches `projectId`.

## Change history

### 2026-06-13 — created
- **Motivation**: per the user request that each page's sidebar reflect its own
  list; the Research page previously showed the chat history in the sidebar.
- **Goal**: surface saved research projects (and a new-research shortcut) in the
  sidebar so the user can switch projects from anywhere on the page.
- **Key decision**: read from the dedicated `useResearchStore` (not
  `useAppStore`), matching how the rest of the research feature is wired.
