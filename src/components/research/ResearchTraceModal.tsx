// Debug modal showing exactly how one research generation ran: run metadata
// (provider / model / mode / step count / duration / repaired), then the
// ordered pipeline steps — building the prompt (with the full messages sent),
// the model request (with raw output + timing), JSON parse/validation, and any
// repair retry. Pure render — receives the trace and an onClose.
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type {
  ResearchGenerationTrace,
  ResearchTraceStep,
  ResearchTraceStepStatus,
} from "../../research/generation-trace";
import { Icons } from "../../icons/icons";
import "../../styles/research-trace.css";

interface ResearchTraceModalProps {
  trace: ResearchGenerationTrace;
  onClose: () => void;
}

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

const KIND_LABEL: Record<ResearchGenerationTrace["kind"], string> = {
  outline: "大纲生成",
  content: "文章生成",
};

/** Map a step status to its status-dot modifier class. */
function dotClass(status: ResearchTraceStepStatus): string {
  return status === "ok" ? "ok" : status === "error" ? "fail" : "info";
}

function StepView({ step, index }: { step: ResearchTraceStep; index: number }) {
  return (
    <div className="rc-trace-step" data-testid={`research-trace-step-${index}`}>
      <div className="rc-trace-step-head">
        <span className={`rc-trace-dot ${dotClass(step.status)}`} />
        <span className="rc-trace-step-label">{step.label}</span>
        {typeof step.durationMs === "number" && (
          <span className="rc-trace-step-time">{formatDuration(step.durationMs)}</span>
        )}
      </div>

      {step.detail && <div className="rc-trace-detail">{step.detail}</div>}

      {step.messages && step.messages.length > 0 && (
        <div className="rc-trace-msgs">
          {step.messages.map((m, i) => (
            <div className="rc-trace-msg" key={i}>
              <div className="rc-trace-msg-role">{m.role}</div>
              <pre className="rc-trace-pre">{m.content}</pre>
            </div>
          ))}
        </div>
      )}

      {step.raw != null && (
        <div className="rc-trace-io">
          <div className="rc-trace-io-label">原始输出</div>
          <pre className="rc-trace-pre rc-trace-output">{step.raw}</pre>
        </div>
      )}

      {step.error && (
        <div className="rc-trace-io">
          <div className="rc-trace-io-label">错误</div>
          <pre className="rc-trace-pre rc-trace-error">{step.error}</pre>
        </div>
      )}
    </div>
  );
}

export function ResearchTraceModal({ trace, onClose }: ResearchTraceModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Close on Escape, or a pointer press either outside the panel (click-outside)
  // or on the ✕ button — driven by NATIVE listeners, deliberately NOT React
  // `onClick={onClose}`. This modal is portaled to `document.body` (see below)
  // while the app is hydrated on `document`; in that setup React's synthetic
  // click delegation does not fire for real user clicks inside the portal, so
  // the old scrim/button onClicks silently did nothing and the modal was
  // uncloseable. We use ONE capture-phase `pointerdown` on document instead of
  // `click`: pointerdown reliably targets the pressed element (a real click's
  // mousedown/mouseup can land on different nodes here, so no `click` fires on
  // the button/scrim), and capture is immune to any stopPropagation up the tree.
  // Listeners mount/unmount with the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onDocPointerDown = (e: Event) => {
      const target = e.target as Node;
      const closeBtn = closeBtnRef.current;
      const panel = panelRef.current;
      // Press on the ✕, or anywhere outside the panel → close.
      if ((closeBtn && closeBtn.contains(target)) || (panel && !panel.contains(target))) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDocPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDocPointerDown, true);
    };
  }, [onClose]);

  // Render via a portal to <body>: one entry (the canvas outline launcher) sits
  // inside the canvas `.rc-world`, whose CSS `transform` (pan/zoom) would
  // otherwise become the containing block for this fixed-position scrim and
  // shift it off-screen. The portal escapes any transformed ancestor.
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="nb-modal-scrim">
      <div
        ref={panelRef}
        className="nb-modal rc-trace-modal"
        role="dialog"
        aria-modal="true"
        aria-label="生成过程"
        data-testid="research-trace-modal">
        <div className="rc-trace-head">
          <div>
            <div className="rc-trace-title">生成过程</div>
            <div className="rc-trace-meta" data-testid="research-trace-meta">
              {trace.provider}
              {trace.model ? ` · ${trace.model}` : ""} · {KIND_LABEL[trace.kind]} ·{" "}
              {trace.steps.length} 步 · {formatDuration(trace.durationMs)}
            </div>
          </div>
          <button
            type="button"
            ref={closeBtnRef}
            className="nb-ai-close"
            aria-label="关闭"
            data-testid="research-trace-close">
            <Icons.x size={16} />
          </button>
        </div>

        <div className="rc-trace-badges">
          <span className={`rc-trace-badge ${trace.ok ? "ok" : "fail"}`}>
            {trace.ok ? "成功" : "失败"}
          </span>
          {trace.repaired && <span className="rc-trace-badge warn">触发修复重试</span>}
          {trace.error && <span className="rc-trace-badge fail">{trace.error}</span>}
        </div>

        <div className="rc-trace-body">
          {trace.steps.map((step, i) => (
            <StepView key={i} step={step} index={i} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
