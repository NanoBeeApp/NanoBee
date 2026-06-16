// Pure render component for the AI settings page.
// Master-detail layout: a provider list on the left (master), the selected
// provider's settings on the right (detail) — API key, host, model picker and
// a connection test. Stateless except for UI-only password-visibility toggles;
// all data + callbacks come from SettingsView. Rendered inline on the /settings
// page (no modal scrim) — changes auto-save, so there is no save/cancel pair.
//
// Change history:
//   2026-06-15  Wired i18n Phase 1: settings page heading/subtitle/states and
//               a new Language pane added to the master list (zh / en switcher).

import { useState } from "react";
import { Icons } from "../../icons/icons";
import { ProviderLogo } from "../../icons/provider-logos";
import {
	AI_PROVIDERS,
	getWebSearchProviderInfo,
	WEB_SEARCH_PROVIDERS,
	type AiProviderId,
	type AiProviderInfo,
	type WebSearchProviderId,
} from "../../lib/ai-providers";
import type { TestConnectionResult } from "../../lib/useAiSettings";
import { useAuthUser } from "../../lib/useAuth";
import { useLocale, useT } from "../../lib/i18n/LocaleContext";
import type { Locale } from "../../lib/i18n";
import { SUPPORTED_LOCALES } from "../../lib/i18n";
import { AccountSection } from "./AccountSection";
import { NotificationSettings } from "./NotificationSettings";

export interface AiSetupFormValues {
	provider: AiProviderId;
	apiKey: string;
	baseUrl: string;
	model: string;
	/** Chosen web-search provider (Tavily / Brave / Serper / Exa). */
	webSearchProvider: WebSearchProviderId;
	/** API key for the chosen web-search provider. */
	webSearchKey: string;
}

export type TestStatus = "idle" | "testing" | "success" | "error";

/** Inline auto-save status shown at the bottom of the provider column. */
export type SaveState = "idle" | "saving" | "saved" | "error" | "invalid";

export interface AiSettingsFormProps {
	values: AiSetupFormValues;
	info: AiProviderInfo;
	/** True when a key is already stored for the selected provider. */
	hasStoredKey: boolean;
	/** True when a web-search (Tavily) key is already stored. */
	hasStoredWebSearchKey: boolean;
	error: string | null;
	/** Auto-fetched model ids for the current provider (empty until fetched). */
	models: string[];
	modelsLoading: boolean;
	modelsError: string | null;
	/** Connection-test state for the inline status line. */
	testStatus: TestStatus;
	testResult: TestConnectionResult | null;
	/** Auto-save indicator state + its display text. */
	saveState: SaveState;
	saveText: string;
	onProviderChange: (id: AiProviderId) => void;
	onFieldChange: (
		field: "apiKey" | "baseUrl" | "model" | "webSearchKey" | "webSearchProvider",
		value: string,
	) => void;
	onFetchModels: () => void;
	onTestConnection: () => void;
	/** Whether the user is signed in (gates the notification settings query). */
	userSignedIn?: boolean;
}

export function AiSettingsForm(props: AiSettingsFormProps) {
	const { values, info, hasStoredKey, hasStoredWebSearchKey, error } = props;
	const { models, modelsLoading, modelsError, testStatus, testResult, saveState, saveText } = props;
	const [showKey, setShowKey] = useState(false);
	const [showWebSearchKey, setShowWebSearchKey] = useState(false);
	// Which detail pane is shown: an AI model provider, web search, notification
	// preferences, account management, or language.
	const [activePane, setActivePane] = useState<"provider" | "websearch" | "notifications" | "account" | "language">("provider");
	const { data: authUser } = useAuthUser();
	const webSearchInfo = getWebSearchProviderInfo(values.webSearchProvider);
	const { t } = useT();
	const { locale, setLocale } = useLocale();

	// A model is "from the list" only when it matches a fetched id; otherwise the
	// select shows the placeholder and the text input carries the manual value.
	const selectValue = models.includes(values.model) ? values.model : "";

	const keyPlaceholder = hasStoredKey
		? "已保存，留空保持不变"
		: info.keyOptional
			? "可留空，使用 NanoBee 内置额度"
			: "sk-...";

	return (
		<div className="nb-ai-split nb-settings-split" data-testid="ai-settings-form">
			{/* Master: provider list + auto-save status */}
			<div className="nb-ai-master">
				<div className="nb-ai-master-list">
					<div className="nb-ai-master-grp">模型供应商</div>
					<div role="radiogroup" aria-label="AI 模型供应商" style={{ display: "contents" }}>
						{AI_PROVIDERS.map((p) => {
							const selected = activePane === "provider" && values.provider === p.id;
							return (
								<button
									key={p.id}
									type="button"
									role="radio"
									aria-checked={selected}
									className={`nb-ai-prow${selected ? " selected" : ""}`}
									onClick={() => {
										setActivePane("provider");
										props.onProviderChange(p.id);
									}}
									data-testid={`ai-provider-option-${p.id}`}
								>
									<ProviderLogo id={p.id} />
									<span className="nb-ai-prow-name">{p.label}</span>
									{p.id === "openrouter" && <span className="nb-ai-prow-tag">默认</span>}
								</button>
							);
						})}
					</div>
					<div className="nb-ai-master-grp">联网搜索</div>
					<button
						type="button"
						className={`nb-ai-prow${activePane === "websearch" ? " selected" : ""}`}
						aria-current={activePane === "websearch"}
						onClick={() => setActivePane("websearch")}
						data-testid="ai-websearch-entry"
					>
						<span
							className="nb-ai-prow-logo"
							style={{ background: "rgba(14,165,233,0.12)", color: "#0ea5e9" }}
							aria-hidden="true"
						>
							<Icons.globe size={15} />
						</span>
						<span className="nb-ai-prow-name">Web 搜索</span>
					</button>
					<div className="nb-ai-master-grp">偏好设置</div>
					<button
						type="button"
						className={`nb-ai-prow${activePane === "notifications" ? " selected" : ""}`}
						aria-current={activePane === "notifications"}
						onClick={() => setActivePane("notifications")}
						data-testid="settings-notifications-entry"
					>
						<span
							className="nb-ai-prow-logo"
							style={{ background: "rgba(99,91,255,0.10)", color: "var(--brand-2)" }}
							aria-hidden="true"
						>
							<Icons.bell size={15} />
						</span>
						<span className="nb-ai-prow-name">通知</span>
					</button>
					<button
						type="button"
						className={`nb-ai-prow${activePane === "language" ? " selected" : ""}`}
						aria-current={activePane === "language"}
						onClick={() => setActivePane("language")}
						data-testid="settings-language-entry"
					>
						<span
							className="nb-ai-prow-logo"
							style={{ background: "rgba(26,127,85,0.10)", color: "var(--success)" }}
							aria-hidden="true"
						>
							<Icons.globe size={15} />
						</span>
						<span className="nb-ai-prow-name">{t('settings.language.sectionLabel')}</span>
					</button>
					{authUser && (
						<button
							type="button"
							className={`nb-ai-prow${activePane === "account" ? " selected" : ""}`}
							aria-current={activePane === "account"}
							onClick={() => setActivePane("account")}
							data-testid="settings-account-entry"
						>
							<span
								className="nb-ai-prow-logo"
								style={{ background: "rgba(14,165,233,0.10)", color: "#0ea5e9" }}
								aria-hidden="true"
							>
								<Icons.at size={15} />
							</span>
							<span className="nb-ai-prow-name">Account</span>
						</button>
					)}
				</div>
				{saveText && (
					<div
						className="nb-ai-savehint"
						data-state={saveState}
						data-testid="ai-settings-savehint"
						role="status"
					>
						<span className="dot" aria-hidden="true" />
						{saveText}
					</div>
				)}
			</div>

			{/* Detail: AI model provider settings, standalone web search settings,
			    notification preferences, account management, or language. */}
			<div className={`nb-ai-detail${activePane === "account" ? " nb-ai-detail--account" : ""}`}>
				{activePane === "notifications" ? (
					<NotificationSettings userEnabled={props.userSignedIn ?? false} />
				) : activePane === "account" ? (
					authUser ? <AccountSection user={authUser} /> : null
				) : activePane === "language" ? (
					<LanguagePane locale={locale} onSetLocale={setLocale} t={t} />
				) : activePane === "provider" ? (
					<>
						<div className="nb-ai-detail-head">
							<div className="title" data-testid="ai-detail-title">{info.label}</div>
							<div className="sub" data-testid="ai-provider-hint">{info.hint}</div>
						</div>

						<div className="field">
							<label className="field-label" htmlFor="ai-api-key">
								API Key{info.keyOptional ? "（可选）" : ""}
							</label>
							<div className="nb-ai-key-wrap">
								<input
									id="ai-api-key"
									className="input"
									type={showKey ? "text" : "password"}
									autoComplete="new-password"
									value={values.apiKey}
									placeholder={keyPlaceholder}
									onChange={(e) => props.onFieldChange("apiKey", e.target.value)}
									data-testid="ai-api-key-input"
								/>
								<button
									type="button"
									className="nb-ai-key-eye"
									onClick={() => setShowKey((s) => !s)}
									aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
									data-testid="ai-api-key-toggle"
								>
									<Icons.eye size={15} />
								</button>
							</div>
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
							<div className="field-label-row">
								<label className="field-label" htmlFor="ai-model">模型</label>
								{info.canListModels && (
									<button
										type="button"
										className="nb-fetch-models"
										onClick={props.onFetchModels}
										disabled={modelsLoading}
										data-testid="ai-fetch-models"
									>
										<Icons.redo size={13} />
										{modelsLoading ? "获取中…" : "自动获取模型"}
									</button>
								)}
							</div>

							{models.length > 0 && (
								<select
									className="input"
									value={selectValue}
									onChange={(e) => props.onFieldChange("model", e.target.value)}
									aria-label="从列表中选择模型"
									data-testid="ai-model-select"
								>
									<option value="">— 从列表中选择（{models.length} 个）—</option>
									{models.map((m) => (
										<option key={m} value={m}>{m}</option>
									))}
								</select>
							)}

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
							{modelsError ? (
								<p className="nb-ai-subhint nb-ai-subhint-err" data-testid="ai-models-error">
									{modelsError}
								</p>
							) : (
								<p className="nb-ai-subhint">
									{info.canListModels
										? "可点「自动获取模型」从供应商拉取列表，或直接手动填写模型 ID。"
										: "该供应商不支持自动获取，请手动填写模型 ID。"}
								</p>
							)}
						</div>

						<div className="field">
							<label className="field-label">连接测试</label>
							<div className="nb-ai-test">
								<button
									type="button"
									className="btn btn-secondary nb-ai-test-btn"
									onClick={props.onTestConnection}
									disabled={testStatus === "testing"}
									data-testid="ai-test-connection"
								>
									<Icons.bolt size={14} />
									{testStatus === "testing" ? "测试中…" : "测试连接"}
								</button>
								<TestStatusLine status={testStatus} result={testResult} />
							</div>
						</div>
					</>
				) : (
					<>
						<div className="nb-ai-detail-head">
							<div className="title" data-testid="ai-detail-title">Web 搜索</div>
							<div className="sub">
								为 AI 回答配置联网搜索供应商，独立于上方模型供应商。
							</div>
						</div>

						<div className="field">
							<label className="field-label" htmlFor="ai-web-search-provider">搜索供应商</label>
							<select
								id="ai-web-search-provider"
								className="input"
								value={values.webSearchProvider}
								onChange={(e) => props.onFieldChange("webSearchProvider", e.target.value)}
								data-testid="ai-web-search-provider-select"
							>
								{WEB_SEARCH_PROVIDERS.map((p) => (
									<option key={p.id} value={p.id}>{p.label}</option>
								))}
							</select>
						</div>

						<div className="field">
							<label className="field-label" htmlFor="ai-web-search-key">API Key</label>
							<div className="nb-ai-key-wrap">
								<input
									id="ai-web-search-key"
									className="input"
									type={showWebSearchKey ? "text" : "password"}
									autoComplete="new-password"
									value={values.webSearchKey}
									placeholder={
										hasStoredWebSearchKey
											? "已保存，留空保持不变"
											: webSearchInfo.id === "tavily"
												? "可留空，使用内置默认 Key"
												: webSearchInfo.keyPlaceholder
									}
									onChange={(e) => props.onFieldChange("webSearchKey", e.target.value)}
									data-testid="ai-web-search-key-input"
								/>
								<button
									type="button"
									className="nb-ai-key-eye"
									onClick={() => setShowWebSearchKey((s) => !s)}
									aria-label={showWebSearchKey ? "隐藏 Web 搜索 Key" : "显示 Web 搜索 Key"}
									data-testid="ai-web-search-key-toggle"
								>
									<Icons.eye size={15} />
								</button>
							</div>
							<p className="nb-ai-subhint">{webSearchInfo.hint}</p>
						</div>
					</>
				)}

				{error && (
					<div className="field-error" role="alert" data-testid="ai-settings-error">
						{error}
					</div>
				)}
			</div>
		</div>
	);
}

// ── Language pane ─────────────────────────────────────────────────────────────

// Map locale code to its i18n key so the label itself can be translated.
const LOCALE_LABEL_KEY: Record<Locale, 'settings.language.zh' | 'settings.language.en'> = {
	zh: 'settings.language.zh',
	en: 'settings.language.en',
};

interface LanguagePaneProps {
	locale: Locale;
	onSetLocale: (locale: Locale) => void;
	t: (key: Parameters<ReturnType<typeof useT>['t']>[0]) => string;
}

/**
 * Language switcher detail pane shown in the Settings master-detail layout.
 * Renders one button per supported locale; the active locale gets the
 * selected visual state. Changing locale is instant and persisted to
 * localStorage via the LocaleContext setLocale.
 */
function LanguagePane({ locale, onSetLocale, t }: LanguagePaneProps) {
	return (
		<>
			<div className="nb-ai-detail-head">
				<div className="title" data-testid="settings-language-title">
					{t('settings.language.sectionLabel')}
				</div>
				<div className="sub">
					Choose the display language for the app shell.
				</div>
			</div>
			<div className="field">
				<div
					role="radiogroup"
					aria-label={t('settings.language.sectionLabel')}
					style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
					data-testid="language-switcher"
				>
					{SUPPORTED_LOCALES.map((code) => {
						const selected = locale === code;
						return (
							<button
								key={code}
								type="button"
								role="radio"
								aria-checked={selected}
								className={`nb-ai-prow${selected ? ' selected' : ''}`}
								style={{ width: '100%' }}
								onClick={() => onSetLocale(code)}
								data-testid={`language-option-${code}`}
							>
								<span
									className="nb-ai-prow-logo"
									style={{
										background: selected ? 'rgba(99,91,255,0.12)' : 'var(--surface-2)',
										color: selected ? 'var(--brand-2)' : 'var(--ink-3)',
									}}
									aria-hidden="true"
								>
									<Icons.globe size={14} />
								</span>
								<span className="nb-ai-prow-name">{t(LOCALE_LABEL_KEY[code])}</span>
								{selected && (
									<span
										className="nb-ai-prow-tag"
										style={{ marginLeft: 'auto' }}
									>
										✓
									</span>
								)}
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}

/** Inline dot + text reflecting the connection-test state. */
function TestStatusLine({ status, result }: { status: TestStatus; result: TestConnectionResult | null }) {
	let tone: "idle" | "testing" | "success" | "error" = "idle";
	let text = "尚未测试";
	if (status === "testing") {
		tone = "testing";
		text = "正在连接供应商…";
	} else if (status === "success" && result?.ok) {
		tone = "success";
		const parts = ["连接成功"];
		if (typeof result.latencyMs === "number") parts.push(`延迟 ${result.latencyMs}ms`);
		if (typeof result.modelCount === "number") parts.push(`找到 ${result.modelCount} 个模型`);
		text = parts.join(" · ");
	} else if (status === "error") {
		tone = "error";
		text = result?.error ?? "连接失败";
	}
	return (
		<span className={`nb-ai-test-status tone-${tone}`} data-testid="ai-test-result">
			<span className="dot" aria-hidden="true" />
			{text}
		</span>
	);
}
