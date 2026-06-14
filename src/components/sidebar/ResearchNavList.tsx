// Sidebar list for the Research Canvas page. Context-aware:
//  - When a project is open on the canvas, it shows that project's node outline
//    as a tree (研究目录) — ported from Curve's SidePanel — so the rail mirrors
//    the canvas structure and lets you jump between nodes. A "研究项目" toggle
//    peeks the saved-project list without leaving the canvas.
//  - Otherwise (welcome screen, or while peeking), it shows the saved research
//    projects. Clicking a project loads it onto the canvas.
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

  // Outline view — the open project's node tree.
  if (hasOpenProject && !browsing) {
    return (
      <div data-testid="sidebar-research-list">
        <button type="button" className="nb-outline-back" onClick={() => setBrowsing(true)}
          data-testid="research-nav-browse">
          <span className="nb-item-ic"><Icons.chevR size={15} style={BACK_ICON} /></span>
          研究项目
        </button>
        <div className="nb-grp">研究目录</div>
        <ResearchOutlineTree />
      </div>
    );
  }

  // Project-list view.
  return (
    <div data-testid="sidebar-research-list">
      {hasOpenProject && (
        <button type="button" className="nb-outline-back" onClick={() => setBrowsing(false)}
          data-testid="research-nav-back-outline">
          <span className="nb-item-ic"><Icons.chevR size={15} style={BACK_ICON} /></span>
          返回研究目录
        </button>
      )}

      {projects.length === 0 ? (
        <div className="nb-side-empty" data-testid="sidebar-research-empty">还没有研究项目</div>
      ) : (
        <>
          <div className="nb-grp">研究项目</div>
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
