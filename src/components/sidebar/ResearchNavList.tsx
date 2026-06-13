// Sidebar list for the Research Canvas page: the user's saved research
// projects, plus a "新研究" shortcut back to the welcome screen. Clicking a
// project loads it onto the canvas. Reads from the dedicated research store and
// refreshes the list on mount so projects saved elsewhere show up.
import { useEffect } from 'react';
import { useResearchStore } from '../../store/useResearchStore';
import { Icons } from '../../icons/icons';

export function ResearchNavList() {
  const projects = useResearchStore((s) => s.projects);
  const projectId = useResearchStore((s) => s.projectId);
  const phase = useResearchStore((s) => s.phase);
  const listProjects = useResearchStore((s) => s.listProjects);
  const loadProject = useResearchStore((s) => s.loadProject);
  const newResearch = useResearchStore((s) => s.newResearch);

  useEffect(() => {
    void listProjects();
  }, [listProjects]);

  return (
    <div data-testid="sidebar-research-list">
      <div className={`nb-item${phase === 'welcome' ? ' active' : ''}`} onClick={newResearch}
        data-testid="research-nav-new">
        <span className="nb-item-ic"><Icons.plus size={15} /></span>
        <div className="meta"><div className="title">新研究</div></div>
      </div>

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
