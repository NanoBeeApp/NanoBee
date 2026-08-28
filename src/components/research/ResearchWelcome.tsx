// Research entry screen: name a direction → AI builds the outline. Also lists
// the user's saved research projects so they can jump back in. Shown when the
// research store is in the "welcome" phase.

import { useEffect, useState } from "react";
import { useResearchStore } from "../../store/useResearchStore";
import { useImeComposition } from "../../lib/useImeComposition";
import { Icons } from "../../icons/icons";

const EXAMPLES = ["量子力学入门", "罗马帝国的衰亡", "大语言模型原理", "免疫系统如何工作"];

export function ResearchWelcome() {
  const [value, setValue] = useState("");
  const { compositionProps, isSubmitEnter } = useImeComposition();
  const startResearch = useResearchStore((s) => s.startResearch);
  const projects = useResearchStore((s) => s.projects);
  const listProjects = useResearchStore((s) => s.listProjects);
  const loadProject = useResearchStore((s) => s.loadProject);
  const error = useResearchStore((s) => s.error);
  const loadingProject = useResearchStore((s) => s.loadingProject);

  useEffect(() => {
    void listProjects();
  }, [listProjects]);

  const submit = () => {
    if (value.trim()) void startResearch(value);
  };

  return (
    <div className="rc-welcome" data-testid="research-welcome">
      <div className="rc-welcome-inner">
        <div className="rc-welcome-badge">
          <Icons.spark size={15} />
          研究画布
        </div>
        <h1 className="rc-welcome-title">从一个方向，长出一张知识地图</h1>
        <p className="rc-welcome-sub">
          说出你想研究的领域，AI 会自动铺开核心知识点大纲；逐节点深读，沿好奇心继续生长。
        </p>

        {loadingProject && (
          <p className="rc-welcome-status" data-testid="research-load-status">
            正在打开研究项目…
          </p>
        )}
        {error && (
          <p className="rc-welcome-error" role="alert" data-testid="research-load-error">
            {error}
          </p>
        )}

        <div className="rc-welcome-input">
          <input
            type="text"
            value={value}
            placeholder="例如：量子力学入门、罗马帝国的衰亡…"
            onChange={(e) => setValue(e.target.value)}
            {...compositionProps}
            onKeyDown={(e) => {
              // Skip Enter that confirms an IME candidate (Chinese / kana / hangul).
              if (isSubmitEnter(e)) submit();
            }}
            data-testid="research-topic-input"
            autoFocus
          />
          <button onClick={submit} disabled={!value.trim()} data-testid="research-start-button">
            <Icons.arrowRight size={16} />
            开始研究
          </button>
        </div>

        <div className="rc-welcome-examples">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="rc-chip" onClick={() => startResearch(ex)}>
              {ex}
            </button>
          ))}
        </div>

        {projects.length > 0 && (
          <div className="rc-welcome-recent" data-testid="research-recent-projects">
            <div className="rc-welcome-recent-label">最近的研究</div>
            {projects.map((p) => (
              <button
                key={p.id}
                className="rc-recent-item"
                onClick={() => loadProject(p.id)}
                data-testid={`research-project-${p.id}`}>
                <Icons.book size={15} />
                <span className="rc-recent-title">{p.title}</span>
                <span className="rc-recent-meta">{p.nodeCount} 个节点</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
