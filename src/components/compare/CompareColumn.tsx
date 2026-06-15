// One compare column (pure presentation): a head (model picker + remove), a
// scrollable body that renders the model's markdown answer / loading / error /
// empty state, and a foot (elapsed time + copy, or a streaming hint). All
// actions are callbacks; column state comes from the compare store via props.
import type { AiProviderId } from "../../lib/ai-providers";
import type { CompareColumn as CompareColumnState } from "../../store/useCompareStore";
import { modelLabel } from "../../lib/compare-models";
import { Markdown } from "../common/Markdown";
import { Icons } from "../../icons/icons";
import { CompareModelSelect } from "./CompareModelSelect";

interface CompareColumnProps {
	column: CompareColumnState;
	canDelete: boolean;
	canRun: (provider: AiProviderId) => boolean;
	onChangeModel: (provider: AiProviderId, model: string) => void;
	onRemove: () => void;
	onRetry: () => void;
	onCopy: () => void;
	onConfigureKey: () => void;
	/** Shared column width in px (all columns share one width). */
	width: number;
	/** Start dragging the right-edge resize handle (CompareView owns the width). */
	onResizeStart: (e: React.MouseEvent) => void;
}

function fmtMs(ms: number | null): string {
	if (ms == null) return "";
	return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export function CompareColumn({
	column,
	canDelete,
	canRun,
	onChangeModel,
	onRemove,
	onRetry,
	onCopy,
	onConfigureKey,
	width,
	onResizeStart,
}: CompareColumnProps) {
	const { status, content, error, durationMs } = column;
	const label = modelLabel(column.provider, column.model);
	const needsKey = error?.code === "no_key";

	return (
		<article
			className="nb-cmp-col"
			style={{ flex: `1 0 ${width}px` }}
			data-testid={`compare-column-${column.id}`}
		>
			<div className="nb-cmp-col-head">
				<CompareModelSelect
					provider={column.provider}
					model={column.model}
					label={label}
					canRun={canRun}
					onChange={onChangeModel}
					onConfigureKey={onConfigureKey}
				/>
				{canDelete && (
					<button
						type="button"
						className="nb-cmp-icon-btn"
						onClick={onRemove}
						title="Remove this model"
						aria-label={`Remove ${label}`}
						data-testid={`compare-remove-column-${column.id}`}
					>
						<Icons.x size={14} />
					</button>
				)}
			</div>

			<div className="nb-cmp-col-body" data-testid={`compare-result-${column.id}`}>
				{status === "pending" && (
					<div className="nb-cmp-thinking" aria-label="Generating">
						<span className="dot" />
						<span className="dot" />
						<span className="dot" />
						<span className="txt">正在思考…</span>
					</div>
				)}

				{(status === "streaming" || status === "done") && content && (
					<Markdown
						content={content}
						streaming={status === "streaming"}
						className="nb-cmp-md"
					/>
				)}

				{status === "error" && (
					<div className={`nb-cmp-error${needsKey ? " needs-key" : ""}`}>
						<div className="nb-cmp-error-head">
							<Icons.bell size={15} />
							<span>{needsKey ? "需要配置 API Key" : "请求失败"}</span>
						</div>
						<div className="nb-cmp-error-desc">{error?.message}</div>
						{needsKey ? (
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								onClick={onConfigureKey}
								data-testid={`compare-configure-${column.id}`}
							>
								去配置 Key
							</button>
						) : (
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								onClick={onRetry}
								data-testid={`compare-retry-${column.id}`}
							>
								<Icons.redo size={13} /> 重试
							</button>
						)}
					</div>
				)}
			</div>

			<div className="nb-cmp-col-foot">
				{status === "streaming" && <span className="nb-cmp-streaming">生成中…</span>}
				{status === "done" && (
					<>
						<span className="nb-cmp-elapsed">
							<Icons.clock size={12} /> {fmtMs(durationMs)}
						</span>
						<span className="nb-cmp-foot-actions">
							<button
								type="button"
								className="nb-cmp-foot-btn"
								onClick={onCopy}
								title="Copy answer"
								aria-label={`Copy ${label} answer`}
								data-testid={`compare-copy-${column.id}`}
							>
								<Icons.copy size={13} /> 复制
							</button>
							<button
								type="button"
								className="nb-cmp-foot-btn"
								onClick={onRetry}
								title="Regenerate this column"
								aria-label={`Regenerate ${label} answer`}
								data-testid={`compare-regenerate-${column.id}`}
							>
								<Icons.redo size={13} /> 重生成
							</button>
						</span>
					</>
				)}
			</div>

			<div
				className="nb-cmp-resize"
				onMouseDown={onResizeStart}
				title="Drag to resize all columns"
				role="separator"
				aria-orientation="vertical"
				data-testid={`compare-resize-${column.id}`}
			/>
		</article>
	);
}
