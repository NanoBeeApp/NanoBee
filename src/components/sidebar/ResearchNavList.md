# src/components/sidebar/ResearchNavList.tsx

## Responsibility
The sidebar scroll-area list shown while the app is on the Research Canvas page.
A simple **two-level drill-down**:
- **Level 0 — project list** — the saved research projects; clicking one loads it
  onto the canvas. The welcome screen and the "back out of a project" state both
  land here.
- **Level 1 — open project** — the top row is a back affordance (a left arrow +
  the open project's title); below it sits that project's node outline tree
  (研究目录, rendered by `ResearchOutlineTree`), so the rail mirrors the canvas
  structure and lets the user jump between nodes. Clicking the back row returns to
  Level 0.

Starting a new research is the sidebar header's page-aware "new" button
(新建研究), so this list never repeats that affordance.

## Core export / API
- `ResearchNavList()` — self-contained; reads `projects`, `projectId`, `title`,
  `phase`, `order`, `listProjects`, `loadProject` from `useResearchStore`. Local
  `browsing` state pops back up to the project list (Level 0) while a project
  stays open on the canvas.

## Dependencies
- Upstream: `useResearchStore`, `ResearchOutlineTree`, icons
- Downstream: `Sidebar` (rendered when `view === 'research'`)

## Key implementation notes
- Calls `listProjects()` on mount so projects saved elsewhere appear.
- `hasOpenProject = phase === 'canvas' && order.length > 0` gates Level 1;
  loading a different project resets `browsing` (via a `lastProjectId` ref) so the
  rail drills straight into that project's outline.
- The back row is the `.nb-outline-back` button; the project title inside it uses
  `.nb-outline-back-title` (prominent ink/600, truncates when long) while the
  rotated `chevR` arrow stays muted.
- Clicking the already-open project in the list just `setBrowsing(false)` (drills
  back in without a reload); any other project calls `loadProject`.
- Clicking a project also calls `highlightProject()` so the canvas banner shows a
  purple selection ring. For a fresh load it is set in `loadProject(id).then(...)`
  (loadProject clears the flag while swapping snapshots, so setting it after the
  promise resolves avoids the race); the already-open branch sets it synchronously.

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

### 2026-06-14 — segmented toggle replaces contradictory back buttons
- **Motivation**: the user found the outline ↔ project-list switch confusing.
  Each view had its own left-pointing "back" button ("← 研究项目" on the outline,
  "← 返回研究目录" on the list), so it read as a back-stack where each side
  claimed the other was the parent — a directionless two-step loop.
- **Goal**: make it obvious the two views are peers and which one is active.
- **Key decision**: replace both back buttons with one `.nb-switch` segmented
  control. *(Superseded the same day — see below.)*

### 2026-06-14 — two-level drill-down (project title header)
- **Motivation**: the segmented toggle above was the wrong model. The user wanted
  a genuine two-level hierarchy, not a peer toggle: pick a project (Level 0) →
  go *into* it (Level 1), where the top shows the project title with a left arrow
  that backs out to the project list.
- **Goal**: Level 1 header = `← {project title}`, outline below it; Level 0 = the
  plain project list with no back affordance (it is the top).
- **Key decision**: drop the segmented toggle; render the open project's `title`
  (from the store) in the `.nb-outline-back` row as a prominent header, and have
  the back row pop to Level 0. Clicking the open project in the list drills back
  in without a reload.
