// Research view container: switches between the welcome screen and the live
// canvas, renders the slim top strip (project title + new-research action) and
// the reading overlay. Mounted by App.tsx when the app view is "research".

import { useResearchStore } from "../../store/useResearchStore";
import { Icons } from "../../icons/icons";
import { ResearchWelcome } from "./ResearchWelcome";
import { ResearchCanvas } from "./ResearchCanvas";
import { ReadingOverlay } from "./ReadingOverlay";
import "../../styles/research.css";

export function ResearchView() {
  const phase = useResearchStore((s) => s.phase);
  const title = useResearchStore((s) => s.title);
  const generating = useResearchStore((s) => s.generating);
  const error = useResearchStore((s) => s.error);
  const newResearch = useResearchStore((s) => s.newResearch);

  if (phase === "welcome") {
    return (
      <div className="rc-root" data-testid="research-view">
        <ResearchWelcome />
      </div>
    );
  }

  return (
    <div className="rc-root" data-testid="research-view">
      <div className="rc-topbar">
        <span className="rc-topbar-title" title={title}>
          {title}
        </span>
        {generating && (
          <span className="rc-topbar-status" data-testid="research-generating">
            <span className="rc-node-spinner" />
            AI 正在铺开大纲…
          </span>
        )}
        {error && <span className="rc-topbar-error">{error}</span>}
        <button
          className="rc-topbar-action"
          onClick={newResearch}
          data-testid="research-new-button">
          <Icons.plus size={15} />
          新研究
        </button>
      </div>
      <ResearchCanvas />
      <ReadingOverlay />
    </div>
  );
}
