// Global error boundary: catches uncaught render / lifecycle errors anywhere in
// the React tree and shows an on-brand white fallback instead of a blank screen.
// Mount it high in the tree (inside __root.tsx wrapping the router outlet) so
// crashes in any view are caught without taking down the whole document.
//
// The fallback has three parts:
//   1. On-brand NanoBee header (bee logo + wordmark — no store dependency)
//   2. Human-readable one-liner with "reload" + "back to /" buttons
//   3. Collapsed technical detail (<details>) for developers / bug reports
//
// Change history:
//   2026-06-15  Created — global error boundary + TanStack Router errorComponent.
import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional override label for the fallback heading. */
  heading?: string;
}

interface State {
  error: Error | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, eventId: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to console so development isn't silent.
    console.error("[NanoBee] Uncaught render error:", error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleBackToHome = () => {
    // Clear the error state first so navigating back doesn't remount the boundary
    // in the broken state if the route is the same.
    this.setState({ error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }
    const { error } = this.state;
    const heading = this.props.heading ?? "出了点问题";
    return (
      <div className="nb-error-boundary" role="alert" aria-live="assertive">
        <div className="nb-error-card">
          {/* Brand mark — the real logo asset (single source of truth). A
              same-origin static PNG has no JS dependency and is normally
              already cached, so it stays resilient on the error screen. */}
          <div className="nb-error-logo" aria-hidden="true">
            <img className="nb-brand-bee" src="/brand/nanobee-bee.png" alt="" />
          </div>
          <div className="nb-error-wordmark">
            Nano<b>Bee</b>
          </div>
          <h1 className="nb-error-heading">{heading}</h1>
          <p className="nb-error-sub">
            页面遇到了一个意外错误。你可以重新加载页面，或者返回首页继续使用。
          </p>
          <div className="nb-error-actions">
            <button
              className="btn btn-primary"
              onClick={this.handleReload}
              data-testid="error-reload"
            >
              重新加载
            </button>
            <button
              className="btn btn-ghost"
              onClick={this.handleBackToHome}
              data-testid="error-back-home"
            >
              返回聊天
            </button>
          </div>
          {/* Collapsed technical detail — helpful in dev, unobtrusive in prod */}
          <details className="nb-error-detail">
            <summary className="nb-error-detail-toggle">查看技术细节</summary>
            <pre className="nb-error-stack">{error.message}{error.stack ? `\n\n${error.stack}` : ""}</pre>
          </details>
        </div>
      </div>
    );
  }
}

// Functional wrapper used as a TanStack Router `errorComponent` — the router
// passes `{ error, reset }` props. Delegates to the same visual design.
export function RouteErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="nb-error-boundary" role="alert" aria-live="assertive">
      <div className="nb-error-card">
        <div className="nb-error-logo" aria-hidden="true">
          <img className="nb-brand-bee" src="/brand/nanobee-bee.png" alt="" />
        </div>
        <div className="nb-error-wordmark">
          Nano<b>Bee</b>
        </div>
        <h1 className="nb-error-heading">此页面遇到了问题</h1>
        <p className="nb-error-sub">
          当前视图崩溃了，但其他页面仍然正常。你可以重试，或者返回首页。
        </p>
        <div className="nb-error-actions">
          <button
            className="btn btn-primary"
            onClick={reset}
            data-testid="error-reset"
          >
            重试
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { window.location.href = "/"; }}
            data-testid="error-back-home"
          >
            返回聊天
          </button>
        </div>
        <details className="nb-error-detail">
          <summary className="nb-error-detail-toggle">查看技术细节</summary>
          <pre className="nb-error-stack">{error.message}{error.stack ? `\n\n${error.stack}` : ""}</pre>
        </details>
      </div>
    </div>
  );
}
