// Research view container: switches between the welcome screen and the live
// canvas, and renders the reading overlay. There is intentionally NO top header
// bar — the research topic lives in the canvas banner, so the canvas fills the
// whole surface (maximize content, minimize chrome). Starting a new research
// lives in the left sidebar (ResearchNavList → "新研究"), not on the canvas; the
// only floating canvas chrome is a transient generation-status / error pill.

import { useResearchStore } from "../../store/useResearchStore";
import { useResearchUrlSync } from "./useResearchUrlSync";
import { ResearchWelcome } from "./ResearchWelcome";
import { ResearchCanvas } from "./ResearchCanvas";
import { ReadingOverlay } from "./ReadingOverlay";
import "../../styles/research.css";

export function ResearchView() {
  // Keep the URL (?project=&node=) and the store in sync so the open project +
  // reading overlay survive a refresh and are bookmarkable.
  useResearchUrlSync();

  const phase = useResearchStore((s) => s.phase);
  const generating = useResearchStore((s) => s.generating);
  const error = useResearchStore((s) => s.error);

  if (phase === "welcome") {
    return (
      <div className="rc-root" data-testid="research-view">
        <ResearchWelcome />
      </div>
    );
  }

  return (
    <div className="rc-root" data-testid="research-view">
      <ResearchCanvas />

      {(generating || error) && (
        <div className="rc-actions">
          {generating && (
            <span className="rc-actions-status" data-testid="research-generating">
              <span className="rc-node-spinner" />
              AI 正在铺开大纲…
            </span>
          )}
          {error && <span className="rc-actions-error">{error}</span>}
        </div>
      )}

      <ReadingOverlay />
    </div>
  );
}
