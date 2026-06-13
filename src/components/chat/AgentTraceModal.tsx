// Debug modal showing how an AI reply was produced: every agent-loop
// iteration with the model's text, each tool call's name / arguments /
// output / timing, plus run-level metadata (provider, model, toolset,
// total duration). Pure render — receives the trace and an onClose.
import type { AgentTrace, AgentTraceToolCall } from "../../lib/agent-trace";
import { Icons } from "../../icons/icons";
import "../../styles/agent-trace.css";

interface AgentTraceModalProps {
	trace: AgentTrace;
	onClose: () => void;
}

function formatDuration(ms: number): string {
	return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function ToolCallView({ call }: { call: AgentTraceToolCall }) {
	return (
		<div className="nb-trace-tool" data-testid="agent-trace-tool-call">
			<div className="nb-trace-tool-head">
				<span className={`nb-trace-dot ${call.ok ? "ok" : "fail"}`} />
				<span className="nb-trace-tool-name">{call.name}</span>
				<span className="nb-trace-tool-time">{formatDuration(call.durationMs)}</span>
			</div>
			<div className="nb-trace-io">
				<div className="nb-trace-io-label">参数</div>
				<pre className="nb-trace-pre">{JSON.stringify(call.arguments, null, 2)}</pre>
			</div>
			<div className="nb-trace-io">
				<div className="nb-trace-io-label">{call.ok ? "输出" : "错误"}</div>
				<pre className="nb-trace-pre nb-trace-output">{call.output}</pre>
			</div>
		</div>
	);
}

export function AgentTraceModal({ trace, onClose }: AgentTraceModalProps) {
	return (
		<div className="nb-modal-scrim" onClick={onClose}>
			<div
				className="nb-modal nb-trace-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Agent 执行过程"
				onClick={(e) => e.stopPropagation()}
				data-testid="agent-trace-modal"
			>
				<div className="nb-trace-head">
					<div>
						<div className="nb-trace-title">Agent 执行过程</div>
						<div className="nb-trace-meta" data-testid="agent-trace-meta">
							{trace.provider} · {trace.model} · {trace.iterations.length} 轮 ·{" "}
							{formatDuration(trace.durationMs)}
						</div>
					</div>
					<button
						type="button"
						className="nb-ai-close"
						onClick={onClose}
						aria-label="关闭"
						data-testid="agent-trace-close"
					>
						<Icons.x size={16} />
					</button>
				</div>

				<div className="nb-trace-tools" data-testid="agent-trace-toolset">
					可用工具：
					{trace.tools.length > 0
						? trace.tools.map((t) => (
								<span key={t} className="nb-trace-chip">{t}</span>
							))
						: "（无）"}
				</div>

				<div className="nb-trace-body">
					{trace.iterations.map((it) => (
						<div
							className="nb-trace-iter"
							key={it.n}
							data-testid={`agent-trace-iteration-${it.n}`}
						>
							<div className="nb-trace-iter-label">
								第 {it.n} 轮
								{it.toolCalls.length > 0
									? ` · ${it.toolCalls.length} 次工具调用`
									: " · 直接回答"}
							</div>
							{it.text && <div className="nb-trace-text">{it.text}</div>}
							{it.toolCalls.map((call, i) => (
								<ToolCallView key={`${it.n}-${i}`} call={call} />
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
