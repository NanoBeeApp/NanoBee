# src/components/sidebar/ResearchNavList.tsx

## Responsibility
The sidebar scroll-area list shown while the app is on the Research Canvas page.
Context-aware:
- **Outline view** — when a project is open on the canvas, it shows that
  project's node outline as a tree (研究目录, rendered by `ResearchOutlineTree`),
  so the rail mirrors the canvas structure and lets the user jump between nodes.
  A "研究项目" toggle peeks the saved-project list without leaving the canvas.
- **Project-list view** — otherwise (welcome screen, or while peeking) it lists
  the saved research projects; clicking one loads it onto the canvas.

Starting a new research is the sidebar header's page-aware "new" button
(新建研究), so this list never repeats that affordance.

## Core export / API
- `ResearchNavList()` — self-contained; reads `projects`, `projectId`, `phase`,
  `order`, `listProjects`, `loadProject` from `useResearchStore`. Local
  `browsing` state toggles the project-list peek while a project is open.

## Dependencies
- Upstream: `useResearchStore`, `ResearchOutlineTree`, icons
- Downstream: `Sidebar` (rendered when `view === 'research'`)

## Key implementation notes
- Calls `listProjects()` on mount so projects saved elsewhere appear.
- `hasOpenProject = phase === 'canvas' && order.length > 0` gates the outline
  view; loading a different project resets `browsing` (via a `lastProjectId` ref)
  so the rail snaps back to that project's outline.
- The back affordance reuses the `chevR` icon rotated 180° (no dedicated left
  chevron in the icon set).

## Change history

### 2026-06-13 — created
- **Motivation**: per the user request that each page's sidebar reflect its own
  list; the Research page previously showed the chat history in the sidebar.
- **Goal**: surface saved research projects (and a new-research shortcut) in the
  sidebar so the user can switch projects from anywhere on the page.
- **Key decision**: read from the dedicated `useResearchStore` (not
  `useAppStore`), matching how the rest of the research feature is wired.

### 2026-06-14 — context-aware outline tree
- **Motivation**: the user wanted the canvas page's left rail to be a tree of the
  open project's nodes, like upstream Curve's `SidePanel`, instead of only a flat
  project list.
- **Goal**: show the open project's outline tree (研究目录) on the canvas while
  keeping the saved-project switcher one toggle away.
- **Key decision**: extract the tree into `ResearchOutlineTree`; keep this
  component as the state/decision layer (which view to show) and let the new
  component be the pure recursive renderer.
