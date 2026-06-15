// One compare column's model picker: a trigger (provider dot + model label)
// that opens a searchable list of common models across providers. Models whose
// provider has no key yet are still selectable but flagged with a lock icon,
// and the panel offers a "Configure API key" shortcut. Pure presentation —
// selection and the key dialog are driven by callbacks.
import { useEffect, useRef, useState } from "react";
import type { AiProviderId } from "../../lib/ai-providers";
import { getProviderInfo } from "../../lib/ai-providers";
import { COMMON_MODELS, PROVIDER_DOT, modelKey } from "../../lib/compare-models";
import { Icons } from "../../icons/icons";

interface CompareModelSelectProps {
	provider: AiProviderId;
	model: string;
	label: string;
	/** Whether a provider can run now (has a key / OpenRouter is built-in). */
	canRun: (provider: AiProviderId) => boolean;
	onChange: (provider: AiProviderId, model: string) => void;
	onConfigureKey: () => void;
}

export function CompareModelSelect({
	provider,
	model,
	label,
	canRun,
	onChange,
	onConfigureKey,
}: CompareModelSelectProps) {
	const [open, setOpen] = useState(false);
	const [q, setQ] = useState("");
	const ref = useRef<HTMLDivElement>(null);

	// Close on outside click or Escape.
	useEffect(() => {
		if (!open) return;
		const onDown = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("mousedown", onDown);
		document.addEventListener("keydown", onKey);
		return () => {
			document.removeEventListener("mousedown", onDown);
			document.removeEventListener("keydown", onKey);
		};
	}, [open]);

	const needle = q.trim().toLowerCase();
	const items = COMMON_MODELS.filter((m) => {
		if (!needle) return true;
		const hay = `${m.label} ${m.model} ${getProviderInfo(m.provider).label}`.toLowerCase();
		return hay.includes(needle);
	});

	const pick = (p: AiProviderId, mdl: string) => {
		onChange(p, mdl);
		setOpen(false);
		setQ("");
	};

	return (
		<div className="nb-cmp-select" ref={ref}>
			<button
				type="button"
				className="nb-cmp-select-trigger"
				onClick={() => setOpen((v) => !v)}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={`选择模型，当前 ${label}`}
				data-testid="compare-model-select-trigger"
			>
				<span className="nb-cmp-dot" style={{ background: PROVIDER_DOT[provider] }} />
				<span className="nb-cmp-select-label">{label}</span>
				{!canRun(provider) && (
					<Icons.bell size={11} style={{ color: "var(--warning)" }} />
				)}
				<Icons.chevD size={12} style={{ color: "var(--ink-4)" }} />
			</button>

			{open && (
				<div className="nb-cmp-select-panel" role="listbox">
					<div className="nb-cmp-select-search">
						<Icons.search size={13} style={{ color: "var(--ink-4)" }} />
						<input
							autoFocus
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="搜索模型…"
							aria-label="搜索模型"
							data-testid="compare-model-search"
						/>
					</div>
					<div className="nb-cmp-select-list">
						{items.map((m) => {
							const selected = m.provider === provider && m.model === model;
							const ready = canRun(m.provider);
							return (
								<button
									type="button"
									key={modelKey(m.provider, m.model)}
									role="option"
									aria-selected={selected}
									className={`nb-cmp-select-item${selected ? " selected" : ""}`}
									onClick={() => pick(m.provider, m.model)}
								>
									<span
										className="nb-cmp-dot"
										style={{ background: PROVIDER_DOT[m.provider] }}
									/>
									<span className="nb-cmp-select-item-label">{m.label}</span>
									<span className="nb-cmp-select-item-provider">
										{getProviderInfo(m.provider).label}
									</span>
									{!ready && (
										<span
											className="nb-cmp-select-item-lock"
											title="需要配置 API Key"
										>
											<Icons.bell size={11} />
										</span>
									)}
									{selected && (
										<Icons.check size={13} style={{ color: "var(--brand-2)" }} />
									)}
								</button>
							);
						})}
						{items.length === 0 && (
							<div className="nb-cmp-select-empty">没有匹配的模型</div>
						)}
					</div>
					<button
						type="button"
						className="nb-cmp-select-foot"
						onClick={() => {
							setOpen(false);
							onConfigureKey();
						}}
						data-testid="compare-open-key-dialog"
					>
						<Icons.gear size={13} />
						配置各模型 API Key
					</button>
				</div>
			)}
		</div>
	);
}
