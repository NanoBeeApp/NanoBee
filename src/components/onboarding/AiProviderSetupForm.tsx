// Pure render component for the AI provider setup dialog.
// Stateless: receives all values + callbacks from AiProviderSetupDialog,
// which owns form state, validation and the save mutation.

import { AI_PROVIDERS, type AiProviderId, type AiProviderInfo } from "../../lib/ai-providers";

export interface AiSetupFormValues {
	provider: AiProviderId;
	apiKey: string;
	baseUrl: string;
	model: string;
}

export interface AiProviderSetupFormProps {
	values: AiSetupFormValues;
	info: AiProviderInfo;
	/** True when a key is already stored for the selected provider. */
	hasStoredKey: boolean;
	/** First login: show the intro copy and the "use defaults" skip action. */
	isFirstSetup: boolean;
	saving: boolean;
	error: string | null;
	onProviderChange: (id: AiProviderId) => void;
	onFieldChange: (field: "apiKey" | "baseUrl" | "model", value: string) => void;
	onSubmit: () => void;
	onSkip: () => void;
	onClose: () => void;
}

export function AiProviderSetupForm(props: AiProviderSetupFormProps) {
	const { values, info, hasStoredKey, isFirstSetup, saving, error } = props;

	const keyPlaceholder = hasStoredKey
		? "已保存，留空保持不变"
		: info.keyOptional
			? "可留空，使用 NanoBee 内置额度"
			: "sk-...";

	return (
		<div className="nb-modal-scrim" onClick={props.onClose}>
			<div
				className="nb-modal"
				role="dialog"
				aria-modal="true"
				aria-label="AI 模型设置"
				onClick={(e) => e.stopPropagation()}
				data-testid="ai-provider-setup-dialog"
			>
				<div className="nb-modal-head">
					<div className="title">{isFirstSetup ? "选择你的 AI 模型" : "AI 模型设置"}</div>
					<div className="sub">
						{isFirstSetup
							? "NanoBee 默认使用内置的 DeepSeek V4 Flash（via OpenRouter），你也可以换成自己的供应商和 API Key。"
							: "对话回复将使用这里配置的供应商与模型。"}
					</div>
				</div>

				<div className="nb-modal-body">
					<div className="nb-ai-providers" role="radiogroup" aria-label="AI 供应商">
						{AI_PROVIDERS.map((p) => (
							<button
								key={p.id}
								type="button"
								role="radio"
								aria-checked={values.provider === p.id}
								className={`nb-ai-provider${values.provider === p.id ? " selected" : ""}`}
								onClick={() => props.onProviderChange(p.id)}
								data-testid={`ai-provider-option-${p.id}`}
							>
								{p.label}
								{p.id === "openrouter" && <span className="tag">默认</span>}
							</button>
						))}
					</div>
					<p className="nb-ai-hint" data-testid="ai-provider-hint">{info.hint}</p>

					<div className="field">
						<label className="field-label" htmlFor="ai-api-key">
							API Key{info.keyOptional ? "（可选）" : ""}
						</label>
						<input
							id="ai-api-key"
							className="input"
							type="password"
							autoComplete="off"
							value={values.apiKey}
							placeholder={keyPlaceholder}
							onChange={(e) => props.onFieldChange("apiKey", e.target.value)}
							data-testid="ai-api-key-input"
						/>
					</div>

					<div className="field">
						<label className="field-label" htmlFor="ai-host">API Host</label>
						<input
							id="ai-host"
							className="input"
							type="text"
							autoComplete="off"
							value={values.baseUrl}
							placeholder={info.defaultBaseUrl || "https://example.com/v1"}
							onChange={(e) => props.onFieldChange("baseUrl", e.target.value)}
							data-testid="ai-host-input"
						/>
					</div>

					<div className="field">
						<label className="field-label" htmlFor="ai-model">模型</label>
						<input
							id="ai-model"
							className="input"
							type="text"
							autoComplete="off"
							value={values.model}
							placeholder={info.defaultModel || "model-id"}
							onChange={(e) => props.onFieldChange("model", e.target.value)}
							data-testid="ai-model-input"
						/>
					</div>

					{error && (
						<div className="field-error" role="alert" data-testid="ai-settings-error">
							{error}
						</div>
					)}
				</div>

				<div className="nb-modal-foot">
					{isFirstSetup ? (
						<button
							type="button"
							className="btn btn-ghost"
							onClick={props.onSkip}
							disabled={saving}
							data-testid="ai-settings-skip"
						>
							先用默认配置
						</button>
					) : (
						<button
							type="button"
							className="btn btn-ghost"
							onClick={props.onClose}
							disabled={saving}
							data-testid="ai-settings-cancel"
						>
							取消
						</button>
					)}
					<button
						type="button"
						className="btn btn-primary"
						onClick={props.onSubmit}
						disabled={saving}
						data-testid="ai-settings-save"
					>
						{saving ? "保存中…" : "保存"}
					</button>
				</div>
			</div>
		</div>
	);
}
