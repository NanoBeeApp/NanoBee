// Multi-model compare — a feature OF the chat page (not a separate page and not
// a top-level nav entry): a second-level view rendered inside the chat route at
// /?compare=1, opened from the chat composer's "多模型对比" button and dismissed
// back to chat. Owns the toolbar (add model / regenerate all / share), the
// horizontal column grid (all columns scroll together vertically; shared width
// is drag-resizable), the shared bottom composer, the empty-state guidance, and
// the provider-key dialog. State + streaming live in useCompareStore; URL sync
// is wired by useCompareUrlSync. The chat tile stays active while it is open.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useCompareStore } from "../../store/useCompareStore";
import { useAppStore } from "../../store/useAppStore";
import { MAX_COMPARE_COLUMNS, MIN_COMPARE_COLUMNS } from "../../lib/compare-models";
import { Icons } from "../../icons/icons";
import { CompareColumn } from "./CompareColumn";
import { CompareComposer } from "./CompareComposer";
import { ProviderKeyDialog } from "./ProviderKeyDialog";
import { useCompareUrlSync } from "./useCompareUrlSync";
import "../../styles/compare.css";

export function CompareView() {
	useCompareUrlSync();

	const columns = useCompareStore((s) => s.columns);
	const lastPrompt = useCompareStore((s) => s.lastPrompt);
	const columnWidth = useCompareStore((s) => s.columnWidth);
	const providersLoaded = useCompareStore((s) => s.providersLoaded);
	const loadProviders = useCompareStore((s) => s.loadProviders);
	const addColumn = useCompareStore((s) => s.addColumn);
	const removeColumn = useCompareStore((s) => s.removeColumn);
	const setColumnModel = useCompareStore((s) => s.setColumnModel);
	const setColumnWidth = useCompareStore((s) => s.setColumnWidth);
	const saveColumnWidth = useCompareStore((s) => s.saveColumnWidth);
	const run = useCompareStore((s) => s.run);
	const regenerateAll = useCompareStore((s) => s.regenerateAll);
	const retryColumn = useCompareStore((s) => s.retryColumn);
	const canRun = useCompareStore((s) => s.canRun);
	const toast = useAppStore((s) => s.toast);
	const navigate = useNavigate();

	const [keyDialogOpen, setKeyDialogOpen] = useState(false);

	useEffect(() => {
		if (!providersLoaded) void loadProviders();
	}, [providersLoaded, loadProviders]);

	// Drag the right-edge handle to resize ALL columns at once; the width
	// persists to localStorage on release (handled by the store).
	const onResizeStart = (e: React.MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;
		const startW = columnWidth;
		const onMove = (ev: MouseEvent) => setColumnWidth(startW + (ev.clientX - startX));
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
			saveColumnWidth();
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	};

	const copyColumn = async (content: string) => {
		try {
			await navigator.clipboard.writeText(content);
			toast("已复制回答");
		} catch {
			toast("复制失败");
		}
	};

	const share = async () => {
		try {
			await navigator.clipboard.writeText(window.location.href);
			toast("已复制对比链接");
		} catch {
			toast("复制失败");
		}
	};

	// Navigate back to plain chat (drop the ?compare=1 flag).
	const goBack = () => {
		void navigate({ to: "/", search: {} });
	};

	const canDelete = columns.length > MIN_COMPARE_COLUMNS;
	const showEmpty = !lastPrompt;

	return (
		<div className="nb-cmp-view" data-testid="compare-view">
			<header className="nb-cmp-bar">
				<div className="nb-cmp-bar-left">
					<button
						type="button"
						className="nb-cmp-icon-btn"
						onClick={goBack}
						title="返回聊天"
						aria-label="返回聊天"
						data-testid="compare-back"
					>
						<Icons.chevR size={16} style={{ transform: "rotate(180deg)" }} />
					</button>
					<span className="nb-cmp-bar-title">模型对比</span>
				</div>
				<div className="nb-cmp-bar-right">
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={addColumn}
						disabled={columns.length >= MAX_COMPARE_COLUMNS}
						title={
							columns.length >= MAX_COMPARE_COLUMNS
								? "最多对比 6 个模型"
								: "添加一个模型"
						}
						data-testid="compare-add-model"
					>
						<Icons.plus size={14} /> 添加模型
					</button>
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={regenerateAll}
						disabled={!lastPrompt}
						title="用同一问题重跑所有模型"
						data-testid="compare-regenerate-all"
					>
						<Icons.redo size={14} /> 全部重生成
					</button>
					<button
						type="button"
						className="btn btn-ghost btn-sm"
						onClick={share}
						title="复制可分享的对比链接"
						data-testid="compare-share"
					>
						<Icons.up size={14} /> 分享
					</button>
				</div>
			</header>

			<div className="nb-cmp-grid" data-testid="compare-grid">
				{columns.map((col) => (
					<CompareColumn
						key={col.id}
						column={col}
						canDelete={canDelete}
						canRun={canRun}
						onChangeModel={(p, m) => setColumnModel(col.id, p, m)}
						onRemove={() => removeColumn(col.id)}
						onRetry={() => retryColumn(col.id)}
						onCopy={() => void copyColumn(col.content)}
						onConfigureKey={() => setKeyDialogOpen(true)}
						width={columnWidth}
						onResizeStart={onResizeStart}
					/>
				))}

				{showEmpty && (
					<div className="nb-cmp-empty" aria-hidden="true">
						<div className="nb-cmp-empty-glyph">
							<Icons.grid size={24} />
						</div>
						<div className="nb-cmp-empty-title">选择模型，开始对比</div>
						<div className="nb-cmp-empty-desc">
							在下方输入一个问题，看看不同模型分别怎么回答
						</div>
					</div>
				)}
			</div>

			<CompareComposer onSend={run} columnCount={columns.length} />

			{keyDialogOpen && <ProviderKeyDialog onClose={() => setKeyDialogOpen(false)} />}
		</div>
	);
}
