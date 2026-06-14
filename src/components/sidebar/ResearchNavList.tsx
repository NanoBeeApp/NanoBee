// Sidebar list for the Research Canvas page — a simple two-level drill-down:
//  - Level 0: the saved-project list (研究项目). The welcome screen and the
//    "back out of a project" state both land here.
//  - Level 1: an open project. The top row is a back affordance — a left arrow
//    plus the project title — and below it sits that project's node outline tree
//    (研究目录, ported from Curve's SidePanel). Clicking the back row returns to
//    the project list (Level 0).
// Starting a new research is the sidebar header's page-aware "new" button
// (新建研究), so this list never repeats that affordance. Reads from the
// dedicated research store and refreshes the list on mount so projects saved
// elsewhere show up.
import { useEffect, useRef, useState } from 'react';
import { useResearchStore } from '../../store/useResearchStore';
import { ResearchOutlineTree } from '../research/ResearchOutlineTree';
import { Icons } from '../../icons/icons';

const BACK_ICON = { transform: 'rotate(180deg)' } as const;

export function ResearchNavList() {
  const projects = useResearchStore((s) => s.projects);
  const projectId = useResearchStore((s) => s.projectId);
  const title = useResearchStore((s) => s.title);
  const phase = useResearchStore((s) => s.phase);
  const order = useResearchStore((s) => s.order);
  const listProjects = useResearchStore((s) => s.listProjects);
  const loadProject = useResearchStore((s) => s.loadProject);
  const highlightProject = useResearchStore((s) => s.highlightProject);

  // When a project is open we default to its outline; `browsing` pops back up to
  // the project list (Level 0) without unloading the canvas.
  const [browsing, setBrowsing] = useState(false);
  const lastProjectId = useRef(projectId);

  useEffect(() => {
    void listProjects();
  }, [listProjects]);

  // Loading a different project drills back into its outline.
  useEffect(() => {
    if (projectId !== lastProjectId.current) {
      lastProjectId.current = projectId;
      setBrowsing(false);
    }
  }, [projectId]);

  const hasOpenProject = phase === 'canvas' && order.length > 0;

  // Level 1 — inside an open project: back-to-list header + the node outline.
  if (hasOpenProject && !browsing) {
    return (
      <div data-testid="sidebar-research-list">
        <button type="button" className="nb-outline-back" onClick={() => setBrowsing(true)}
          title={`返回研究项目`} data-testid="research-nav-back-list">
          <span className="nb-item-ic"><Icons.chevR size={15} style={BACK_ICON} /></span>
          <span className="nb-outline-back-title">{title || '研究项目'}</span>
        </button>
        <ResearchOutlineTree />
      </div>
    );
  }

  // Level 0 — the saved-project list. Clicking the already-open project just
  // drills back into it (no reload); any other project loads onto the canvas.
  // Either way, flag the canvas to highlight the project banner. For a fresh
  // load we set the flag *after* loadProject resolves, since loadProject clears
  // it as part of swapping in the new snapshot.
  const openProject = (id: string) => {
    if (id === projectId) {
      setBrowsing(false);
      highlightProject();
    } else {
      void loadProject(id).then(() => highlightProject());
    }
  };

  return (
    <div data-testid="sidebar-research-list">
      {projects.length === 0 ? (
        <div className="nb-side-empty" data-testid="sidebar-research-empty">还没有研究项目</div>
      ) : (
        <>
          <div className="nb-grp">研究项目</div>
          {projects.map((p) => (
            <div key={p.id} className={`nb-item${phase === 'canvas' && p.id === projectId ? ' active' : ''}`}
              onClick={() => openProject(p.id)} data-testid={`research-nav-item-${p.id}`}>
              <span className="nb-item-ic"><Icons.book size={15} /></span>
              <div className="meta">
                <div className="title">{p.title}</div>
                <div className="sub">{p.nodeCount} 个节点</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
