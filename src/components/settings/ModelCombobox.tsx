// Editable model-id combobox for the AI settings pane. One text field the user
// can type a custom model id into, plus a chevron that opens a filterable
// popover of the provider's auto-fetched ids. The text field doubles as the
// filter (type-ahead), so there is a single source of truth for the value — no
// parallel select + input pair. Extracted from AiSettingsForm.tsx (2026-06-18)
// when the settings page moved to a 3-column layout, to keep that file focused.

import { useEffect, useRef, useState } from "react";
import { Icons } from "../../icons/icons";

interface ModelComboboxProps {
	/** Current model id — either a fetched id or a hand-typed custom one. */
	value: string;
	/** Auto-fetched model ids for the provider (empty until fetched). */
	models: string[];
	/** True while the provider's model list is being fetched. */
	loading: boolean;
	/** Whether the provider supports listing models (gates the dropdown). */
	canList: boolean;
	placeholder: string;
	onChange: (value: string) => void;
}

/**
 * Editable combobox for picking a model: one text field the user can type a
 * custom model id into, plus a chevron that opens a filterable popover of the
 * fetched ids. The text field doubles as the filter (type-ahead), so there is a
 * single source of truth for the value.
 */
export function ModelCombobox({ value, models, loading, canList, placeholder, onChange }: ModelComboboxProps) {
	const [open, setOpen] = useState(false);
	const [highlight, setHighlight] = useState(-1);
	const rootRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// When the value exactly matches a fetched id, show the whole list so it can
	// be browsed; otherwise filter by case-insensitive substring of the input.
	const needle = value.trim().toLowerCase();
	const filtered =
		!needle || models.includes(value)
			? models
			: models.filter((m) => m.toLowerCase().includes(needle));

	// Close on outside click while open.
	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [open]);

	// Keep the highlighted row scrolled into view as the user arrows through it.
	useEffect(() => {
		if (!open) return;
		listRef.current
			?.querySelector<HTMLElement>('[data-active="true"]')
			?.scrollIntoView({ block: "nearest" });
	}, [highlight, open]);

	// Auto-open the popover when a fetch starts so the user sees the loading
	// state then the results. Adjusts state on a prop change during render (the
	// React-recommended alternative to a setState-in-effect).
	const [prevLoading, setPrevLoading] = useState(loading);
	if (loading !== prevLoading) {
		setPrevLoading(loading);
		if (loading) setOpen(true);
	}

	const openList = () => {
		if (open || !canList) return;
		const idx = filtered.indexOf(value);
		setHighlight(idx >= 0 ? idx : filtered.length > 0 ? 0 : -1);
		setOpen(true);
	};

	const pick = (m: string) => {
		onChange(m);
		setOpen(false);
		inputRef.current?.focus();
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (!canList) return;
		if (!open) {
			if (e.key === "ArrowDown" || e.key === "ArrowUp") {
				e.preventDefault();
				openList();
			}
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (filtered.length) setHighlight((h) => (h + 1) % filtered.length);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (filtered.length) setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
		} else if (e.key === "Enter") {
			if (highlight >= 0 && highlight < filtered.length) {
				e.preventDefault();
				pick(filtered[highlight]);
			} else {
				setOpen(false);
			}
		} else if (e.key === "Escape") {
			e.preventDefault();
			setOpen(false);
		}
	};

	return (
		<div className="nb-modelcb" ref={rootRef} data-testid="ai-model-combobox">
			<input
				id="ai-model"
				ref={inputRef}
				className="input nb-modelcb-input"
				type="text"
				autoComplete="off"
				role="combobox"
				aria-expanded={open}
				aria-controls="nb-modelcb-list"
				aria-autocomplete="list"
				value={value}
				placeholder={placeholder}
				onChange={(e) => {
					onChange(e.target.value);
					setHighlight(0);
					if (canList) setOpen(true);
				}}
				onClick={openList}
				onKeyDown={onKeyDown}
				data-testid="ai-model-input"
			/>
			{canList && (
				<button
					type="button"
					className={`nb-modelcb-toggle${open ? " open" : ""}`}
					tabIndex={-1}
					aria-label="展开模型列表"
					onClick={() => {
						if (open) {
							setOpen(false);
						} else {
							inputRef.current?.focus();
							openList();
						}
					}}
					data-testid="ai-model-toggle"
				>
					<Icons.chevD size={16} />
				</button>
			)}

			{canList && open && (
				<div className="nb-modelcb-panel" role="listbox" id="nb-modelcb-list">
					{loading ? (
						<div className="nb-modelcb-state">正在拉取模型列表…</div>
					) : models.length === 0 ? (
						<div className="nb-modelcb-state">点「自动获取模型」加载列表，或直接输入模型 ID。</div>
					) : filtered.length === 0 ? (
						<div className="nb-modelcb-state">无匹配项 — 按回车使用已输入的内容。</div>
					) : (
						<>
							<div className="nb-modelcb-head">共 {models.length} 个模型</div>
							<div className="nb-modelcb-list" ref={listRef}>
								{filtered.map((m, i) => {
									const selected = m === value;
									return (
										<button
											type="button"
											key={m}
											role="option"
											aria-selected={selected}
											data-active={i === highlight}
											className={`nb-modelcb-item${i === highlight ? " active" : ""}${selected ? " selected" : ""}`}
											onMouseEnter={() => setHighlight(i)}
											onMouseDown={(e) => {
												// Pick before the input blurs so focus returns cleanly.
												e.preventDefault();
												pick(m);
											}}
											data-testid={`ai-model-option-${m}`}
										>
											<span className="nb-modelcb-item-label">{m}</span>
											{selected && <Icons.check size={14} style={{ color: "var(--brand-2)" }} />}
										</button>
									);
								})}
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}
