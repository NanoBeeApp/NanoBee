// Keyboard-shortcuts pane for the /settings master-detail panel.
// Shows the user-configurable single-key shortcuts (toggle left / right sidebar)
// with an inline rebind capture, plus a read-only list of the built-in
// shortcuts (⌘N / ⌘J / Esc) for discoverability. Rendered as the "shortcuts"
// pane of AiSettingsForm. Bindings live in `store/useShortcuts.ts`.

import { useEffect, useState } from "react";
import { Icons } from "../../icons/icons";
import {
	FIXED_SHORTCUTS,
	SHORTCUT_DEFS,
	formatKey,
	normalizeKey,
	type ShortcutId,
} from "../../lib/shortcuts";
import { useShortcuts } from "../../store/useShortcuts";

/** One configurable shortcut row: label + description, key chip, rebind + reset. */
function ConfigurableRow({
	id,
	label,
	description,
	defaultKey,
	currentKey,
	capturing,
	onStartCapture,
	onResetBinding,
}: {
	id: ShortcutId;
	label: string;
	description: string;
	defaultKey: string;
	currentKey: string;
	capturing: boolean;
	onStartCapture: (id: ShortcutId) => void;
	onResetBinding: (id: ShortcutId) => void;
}) {
	const isDefault = currentKey.toUpperCase() === defaultKey.toUpperCase();
	return (
		<div className="nb-sc-row" data-testid={`shortcut-row-${id}`}>
			<div className="nb-sc-info">
				<span className="nb-sc-label">{label}</span>
				<span className="nb-sc-desc">{description}</span>
			</div>
			<div className="nb-sc-actions">
				{!isDefault && !capturing && (
					<button
						type="button"
						className="nb-sc-reset"
						title={`恢复默认（${formatKey(defaultKey)}）`}
						onClick={() => onResetBinding(id)}
						data-testid={`shortcut-reset-${id}`}
					>
						<Icons.redo size={13} />
					</button>
				)}
				{capturing ? (
					<span className="nb-sc-capture" data-testid={`shortcut-capturing-${id}`}>
						按下按键…
					</span>
				) : (
					<button
						type="button"
						className="nb-sc-key nb-sc-key-btn"
						title="点击后按一个字母或数字键来重新绑定"
						onClick={() => onStartCapture(id)}
						data-testid={`shortcut-key-${id}`}
					>
						{formatKey(currentKey)}
					</button>
				)}
			</div>
		</div>
	);
}

export function ShortcutsSection() {
	const bindings = useShortcuts((s) => s.bindings);
	const setBinding = useShortcuts((s) => s.setBinding);
	const resetBinding = useShortcuts((s) => s.resetBinding);
	const resetAll = useShortcuts((s) => s.resetAll);

	// Which shortcut (if any) is in rebind-capture mode, and a transient hint
	// shown when the user pressed an unusable key.
	const [capturingId, setCapturingId] = useState<ShortcutId | null>(null);
	const [hint, setHint] = useState<string | null>(null);

	// While capturing, grab the next keypress on the capture phase and swallow it
	// (stopPropagation) so the global S/D handler on window doesn't also fire.
	useEffect(() => {
		if (!capturingId) return;
		const onKeyDown = (e: KeyboardEvent) => {
			// Let modifier keys pressed on their own pass without ending capture.
			if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) return;
			e.preventDefault();
			e.stopPropagation();
			if (e.key === "Escape") {
				setCapturingId(null);
				return;
			}
			const key = normalizeKey(e.key);
			if (!key) {
				setHint("请使用字母 A–Z 或数字 0–9");
				return;
			}
			setBinding(capturingId, key);
			setCapturingId(null);
			setHint(null);
		};
		window.addEventListener("keydown", onKeyDown, { capture: true });
		return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
	}, [capturingId, setBinding]);

	const startCapture = (id: ShortcutId) => {
		setHint(null);
		setCapturingId(id);
	};

	return (
		<>
			<div className="nb-ai-detail-head">
				<div className="title" data-testid="shortcuts-title">快捷键</div>
				<div className="sub">
					自定义全局快捷键。在输入框 / 编辑器中输入时，快捷键会自动让位，不会误触。
				</div>
			</div>

			<div className="field">
				<div className="field-label-row">
					<label className="field-label">可自定义</label>
					<button
						type="button"
						className="nb-fetch-models"
						onClick={() => { setCapturingId(null); setHint(null); resetAll(); }}
						data-testid="shortcuts-reset-all"
					>
						<Icons.redo size={13} />
						恢复默认
					</button>
				</div>
				<div className="nb-sc-list" data-testid="shortcuts-configurable">
					{SHORTCUT_DEFS.map((def) => (
						<ConfigurableRow
							key={def.id}
							id={def.id}
							label={def.label}
							description={def.description}
							defaultKey={def.defaultKey}
							currentKey={bindings[def.id]}
							capturing={capturingId === def.id}
							onStartCapture={startCapture}
							onResetBinding={resetBinding}
						/>
					))}
				</div>
				{capturingId && (
					<p className="nb-ai-subhint" data-testid="shortcuts-capture-hint">
						{hint ?? "按一个字母或数字键来绑定，按 Esc 取消。"}
					</p>
				)}
			</div>

			<div className="field">
				<label className="field-label">内置快捷键</label>
				<div className="nb-sc-list" data-testid="shortcuts-fixed">
					{FIXED_SHORTCUTS.map((sc) => (
						<div className="nb-sc-row" key={sc.keys}>
							<div className="nb-sc-info">
								<span className="nb-sc-label">{sc.label}</span>
							</div>
							<div className="nb-sc-actions">
								<span className="nb-sc-key nb-sc-key-static">{sc.keys}</span>
							</div>
						</div>
					))}
				</div>
			</div>
		</>
	);
}
