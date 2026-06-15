// Entry button + open/close state for the research generation-trace debug
// modal. Reused in two placements: under the canvas research banner (outline
// generation) and inside the reading overlay (article generation). Keeps the
// modal's open state here so the host components (canvas / reading overlay)
// stay focused on their own concerns — the container half of the
// container/presentational split with ResearchTraceModal.
import { useState } from "react";
import type { ResearchGenerationTrace } from "../../research/generation-trace";
import { Icons } from "../../icons/icons";
import { ResearchTraceModal } from "./ResearchTraceModal";
import "../../styles/research-trace.css";

interface ResearchTraceLauncherProps {
  trace: ResearchGenerationTrace;
  /** Where the entry button sits — drives its label, position, and testid. */
  placement: "outline" | "content";
}

const PLACEMENT = {
  outline: { label: "查看大纲生成过程", testid: "research-outline-trace-button" },
  content: { label: "查看生成过程", testid: "research-content-trace-button" },
} as const;

export function ResearchTraceLauncher({ trace, placement }: ResearchTraceLauncherProps) {
  const [open, setOpen] = useState(false);
  const cfg = PLACEMENT[placement];

  return (
    <>
      <button
        type="button"
        className={`rc-trace-open rc-trace-open--${placement}`}
        onClick={() => setOpen(true)}
        title={cfg.label}
        data-testid={cfg.testid}>
        <Icons.bolt size={12} />
        <span>{cfg.label}</span>
      </button>
      {open && <ResearchTraceModal trace={trace} onClose={() => setOpen(false)} />}
    </>
  );
}
