// Modal for managing per-provider API keys used by the compare page. Lists
// every provider with its status (built-in / configured / not set); each row
// expands to an inline key (+ host for custom) form. Keys are sent to the
// worker and stored encrypted; this dialog only ever shows a masked status,
// never the raw key value.
import { useState } from "react";
import type { AiProviderId } from "../../lib/ai-providers";
import { PROVIDER_DOT } from "../../lib/compare-models";
import { useCompareStore } from "../../store/useCompareStore";
import { useAppStore } from "../../store/useAppStore";
import { Icons } from "../../icons/icons";

interface ProviderKeyDialogProps {
	onClose: () => void;
}

export function ProviderKeyDialog({ onClose }: ProviderKeyDialogProps) {
	const providers = useCompareStore((s) => s.providers);
	const configured = useCompareStore((s) => s.configured);
	const signedIn = useCompareStore((s) => s.signedIn);
	const saveKey = useCompareStore((s) => s.saveProviderKey);
	const deleteKey = useCompareStore((s) => s.deleteProviderKey);
	const toast = useAppStore((s) => s.toast);

	const [expanded, setExpanded] = useState<AiProviderId | null>(null);
	const [keyInput, setKeyInput] = useState("");
	const [hostInput, setHostInput] = useState("");
	const [saving, setSaving] = useState(false);

	const statusOf = (id: AiProviderId): "configured" | "builtin" | "none" => {
		if (configured.some((c) => c.provider === id && c.hasApiKey)) return "configured";
		if (id === "openrouter") return "builtin";
		return "none";
	};

	const toggle = (id: AiProviderId) => {
		setExpanded((cur) => (cur === id ? null : id));
		setKeyInput("");
		setHostInput("");
	};

	const onSave = async (id: AiProviderId, isCustom: boolean) => {
		if (isCustom && !hostInput.trim()) {
			toast("自定义供应商需要填写 API Host");
			return;
		}
		if (!keyInput.trim() && id !== "openrouter") {
			toast("请填写 API Key");
			return;
		}
		setSaving(true);
		const ok = await saveKey(id, keyInput.trim(), hostInput.trim());
		setSaving(false);
		if (ok) {
			toast("已保存");
			setExpanded(null);
			setKeyInput("");
			setHostInput("");
		} else {
			toast("保存失败，请检查后重试");
		}
	};

	return (
		<div className="nb-cmp-modal-backdrop" onMouseDown={onClose}>
			<div
				className="nb-cmp-modal"
				role="dialog"
				aria-label="Configure model API keys"
				onMouseDown={(e) => e.stopPropagation()}
				data-testid="compare-key-dialog"
			>
				<button
					type="button"
					className="nb-cmp-modal-close"
					onClick={onClose}
					aria-label="关闭"
				>
					<Icons.x size={16} />
				</button>
				<div className="nb-cmp-modal-title">配置模型 API Key</div>
				<div className="nb-cmp-modal-sub">
					为各家模型保存自己的 API Key 后即可加入对比。OpenRouter 内置额度无需配置。
				</div>

				{!signedIn && (
					<div className="nb-cmp-modal-note">
						登录后可保存自有 API Key；当前可直接使用 OpenRouter 内置模型对比。
					</div>
				)}

				<div className="nb-cmp-key-list">
					{providers.map((p) => {
						const st = statusOf(p.id);
						const isOpen = expanded === p.id;
						const isCustom = p.id === "custom";
						return (
							<div className="nb-cmp-key-row" key={p.id}>
								<button
									type="button"
									className="nb-cmp-key-head"
									onClick={() => signedIn && toggle(p.id)}
									disabled={!signedIn}
									data-testid={`compare-key-row-${p.id}`}
								>
									<span
										className="nb-cmp-dot"
										style={{ background: PROVIDER_DOT[p.id] }}
									/>
									<span className="nb-cmp-key-label">{p.label}</span>
									<span className={`nb-cmp-key-badge ${st}`}>
										{st === "configured"
											? "已配置"
											: st === "builtin"
											? "内置可用"
											: "未配置"}
									</span>
									{signedIn && (
										<Icons.chevD size={13} style={{ color: "var(--ink-4)" }} />
									)}
								</button>

								{isOpen && signedIn && (
									<div className="nb-cmp-key-form">
										<div className="nb-cmp-key-hint">{p.hint}</div>
										{isCustom && (
											<input
												className="input"
												value={hostInput}
												onChange={(e) => setHostInput(e.target.value)}
												placeholder="API Host，如 https://…"
												data-testid={`compare-key-host-${p.id}`}
											/>
										)}
										<input
											className="input"
											type="password"
											value={keyInput}
											onChange={(e) => setKeyInput(e.target.value)}
											placeholder={
												p.id === "openrouter"
													? "可选：你自己的 OpenRouter Key"
													: "粘贴 API Key"
											}
											data-testid={`compare-key-input-${p.id}`}
										/>
										<div className="nb-cmp-key-actions">
											{st === "configured" && (
												<button
													type="button"
													className="btn btn-ghost btn-sm"
													onClick={() => void deleteKey(p.id)}
													data-testid={`compare-key-delete-${p.id}`}
												>
													删除
												</button>
											)}
											<button
												type="button"
												className="btn btn-primary btn-sm"
												disabled={saving}
												onClick={() => void onSave(p.id, isCustom)}
												data-testid={`compare-key-save-${p.id}`}
											>
												{saving ? "保存中…" : "保存"}
											</button>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
