// Research view container: switches between the welcome screen and the live
// canvas, and renders the reading overlay. There is intentionally NO top header
// bar — the research topic lives in the canvas banner, so the canvas fills the
// whole surface (maximize content, minimize chrome). Starting a new research
// lives in the left sidebar (ResearchNavList → "新研究"), not on the canvas; the
// only floating canvas chrome is a transient generation-status / error pill.

import { useEffect } from "react";
import { useResearchStore } from "../../store/useResearchStore";
import { useAppStore } from "../../store/useAppStore";
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
  // Re-mount the canvas per topic so each project initialises (and restores) its
  // own saved pan/zoom independently — see ResearchCanvas' viewport memory.
  const projectId = useResearchStore((s) => s.projectId);

  // Tell the quick chat what the user is currently looking at on the canvas (the
  // open reading overlay, or the lit card) so its "正在看 · …" chip is specific
  // and the model grounds the answer in that node. Cleared on leaving the page.
  const viewingId = useResearchStore((s) => s.activeNodeId ?? s.highlightedNodeId);
  const viewingTitle = useResearchStore((s) => {
    const id = s.activeNodeId ?? s.highlightedNodeId;
    return id ? s.nodes[id]?.title ?? null : null;
  });
  const setQuickCtx = useAppStore((s) => s.setQuickCtx);
  useEffect(() => {
    setQuickCtx(
      viewingId && viewingTitle ? { id: viewingId, title: viewingTitle, topicId: "gold" } : null,
    );
  }, [viewingId, viewingTitle, setQuickCtx]);
  useEffect(() => () => setQuickCtx(null), [setQuickCtx]);

  if (phase === "welcome") {
    return (
      <div className="rc-root" data-testid="research-view">
        <ResearchWelcome />
      </div>
    );
  }

  return (
    <div className="rc-root" data-testid="research-view">
      <ResearchCanvas key={projectId ?? "none"} />

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
