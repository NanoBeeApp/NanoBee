// Sidebar list for the Research Canvas page. Context-aware:
//  - When a project is open on the canvas, a segmented toggle switches between
//    the project's node outline (研究目录) — ported from Curve's SidePanel, so
//    the rail mirrors the canvas structure and lets you jump between nodes — and
//    the saved-project list (研究项目), which you can peek without leaving the
//    canvas. The two views are PEERS, so they share one segmented control rather
//    than two contradictory "back" buttons.
//  - On the welcome screen (no open project) there is no toggle: it just shows
//    the saved research projects. Clicking a project loads it onto the canvas.
// Starting a new research is the sidebar header's page-aware "new" button
// (新建研究), so this list never repeats that affordance. Reads from the
// dedicated research store and refreshes the list on mount so projects saved
// elsewhere show up.
import { useEffect, useRef, useState } from 'react';
import { useResearchStore } from '../../store/useResearchStore';
import { ResearchOutlineTree } from '../research/ResearchOutlineTree';
import { Icons } from '../../icons/icons';

export function ResearchNavList() {
  const projects = useResearchStore((s) => s.projects);
  const projectId = useResearchStore((s) => s.projectId);
  const phase = useResearchStore((s) => s.phase);
  const order = useResearchStore((s) => s.order);
  const listProjects = useResearchStore((s) => s.listProjects);
  const loadProject = useResearchStore((s) => s.loadProject);

  // While a project is open we default to its outline tree; `browsing` lets the
  // user peek the saved-project list without switching projects.
  const [browsing, setBrowsing] = useState(false);
  const lastProjectId = useRef(projectId);

  useEffect(() => {
    void listProjects();
  }, [listProjects]);

  // Loading a different project drops back to its outline tree.
  useEffect(() => {
    if (projectId !== lastProjectId.current) {
      lastProjectId.current = projectId;
      setBrowsing(false);
    }
  }, [projectId]);

  const hasOpenProject = phase === 'canvas' && order.length > 0;
  const showOutline = hasOpenProject && !browsing;

  return (
    <div data-testid="sidebar-research-list">
      {/* Peer toggle between the open project's outline and the project list.
          Only meaningful when a project is open; otherwise the list is all
          there is. */}
      {hasOpenProject && (
        <div className="nb-switch" role="tablist" aria-label="研究侧栏视图">
          <button type="button" role="tab" aria-selected={showOutline}
            className={showOutline ? 'active' : ''}
            onClick={() => setBrowsing(false)} data-testid="research-nav-tab-outline">
            研究目录
          </button>
          <button type="button" role="tab" aria-selected={!showOutline}
            className={!showOutline ? 'active' : ''}
            onClick={() => setBrowsing(true)} data-testid="research-nav-tab-projects">
            研究项目
          </button>
        </div>
      )}

      {showOutline ? (
        <ResearchOutlineTree />
      ) : projects.length === 0 ? (
        <div className="nb-side-empty" data-testid="sidebar-research-empty">还没有研究项目</div>
      ) : (
        <>
          {/* The active "研究项目" tab already names this list when a project is
              open; only the welcome screen needs the standalone group label. */}
          {!hasOpenProject && <div className="nb-grp">研究项目</div>}
          {projects.map((p) => (
            <div key={p.id} className={`nb-item${phase === 'canvas' && p.id === projectId ? ' active' : ''}`}
              onClick={() => void loadProject(p.id)} data-testid={`research-nav-item-${p.id}`}>
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
