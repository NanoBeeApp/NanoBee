// Pure render component for the /settings page.
// Three-column layout: setting categories (左) → the items of the active
// category (中) → the selected item's detail pane (右). The "通用" (General)
// category holds the AI model provider, web search, notifications, language and
// account panes; "研究画布" (Research Canvas) holds the AI reply-style picker;
// "任务"/"聊天" are placeholders for future settings. Stateless except for
// UI-only toggles (password visibility, the active category/item, the reply
// style which it reads from useResearchPrefs); all AI data + callbacks come from
// SettingsView. Rendered inline on the page (no modal scrim) — changes auto-save,
// so there is no save/cancel pair.
//
// Change history:
//   2026-06-15  Wired i18n Phase 1: settings page heading/subtitle/states and
//               a new Language pane added to the master list (zh / en switcher).
//   2026-06-16  Replaced the redundant model <select> + free-text <input> pair
//               with a single editable combobox (type to filter / enter a custom
//               id, chevron opens a filterable popover of fetched models).
//   2026-06-18  Rebuilt the 2-column master-detail into a 3-column
//               categories → items → detail layout; moved the provider list into
//               the AI-model detail pane (as a chip grid); added the Research
//               Canvas "回复风格" pane (科普 / 专业 / 简练).

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
import { useResearchPrefs } from "../../store/useResearchPrefs";
import {
	RESEARCH_STYLE_OPTIONS,
	type ResearchReplyStyle,
} from "../../research/styles";
import { ModelCombobox } from "./ModelCombobox";
import { AccountSection } from "./AccountSection";
import { NotificationSettings } from "./NotificationSettings";
import { ShortcutsSection } from "./ShortcutsSection";

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

/** Inline auto-save status shown at the bottom of the items column. */
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

// ── Navigation model ──────────────────────────────────────────────────────────

/** A leaf settings pane (the detail shown in the right column). */
type PaneId =
	| "general"
	| "ai-model"
	| "websearch"
	| "notifications"
	| "shortcuts"
	| "account"
	| "research-style"
	| "tasks-soon"
	| "chat-soon";

type CategoryId = "general" | "research" | "tasks" | "chat";

interface NavItem {
	id: PaneId;
	label: string;
	icon: keyof typeof Icons;
	tint: { bg: string; color: string };
}

interface NavCategory {
	id: CategoryId;
	label: string;
	icon: keyof typeof Icons;
	tint: { bg: string; color: string };
	items: NavItem[];
}

const TINT_BRAND = { bg: "rgba(99,91,255,0.10)", color: "var(--brand-2)" };
const TINT_SKY = { bg: "rgba(14,165,233,0.12)", color: "#0ea5e9" };
const TINT_GREEN = { bg: "rgba(26,127,85,0.10)", color: "var(--success)" };
const TINT_GREY = { bg: "var(--surface-3)", color: "var(--ink-3)" };

/** Build the category → item tree. The Account item only appears when signed in. */
function buildCategories(signedIn: boolean): NavCategory[] {
	const generalItems: NavItem[] = [
		{ id: "general", label: "通用", icon: "gear", tint: TINT_GREY },
		{ id: "ai-model", label: "AI 模型", icon: "spark", tint: TINT_BRAND },
		{ id: "websearch", label: "联网搜索", icon: "globe", tint: TINT_SKY },
		{ id: "notifications", label: "通知", icon: "bell", tint: TINT_BRAND },
		{ id: "shortcuts", label: "快捷键", icon: "bolt", tint: TINT_GREEN },
	];
	if (signedIn) {
		generalItems.push({ id: "account", label: "账户", icon: "at", tint: TINT_SKY });
	}
	return [
		{ id: "general", label: "通用", icon: "gear", tint: TINT_GREY, items: generalItems },
		{
			id: "research",
			label: "研究画布",
			icon: "book",
			tint: TINT_BRAND,
			items: [{ id: "research-style", label: "回复风格", icon: "star", tint: TINT_BRAND }],
		},
		{
			id: "tasks",
			label: "任务",
			icon: "list",
			tint: TINT_GREEN,
			items: [{ id: "tasks-soon", label: "通用", icon: "gear", tint: TINT_GREY }],
		},
		{
			id: "chat",
			label: "聊天",
			icon: "chat",
			tint: TINT_SKY,
			items: [{ id: "chat-soon", label: "通用", icon: "gear", tint: TINT_GREY }],
		},
	];
}

/** Small logo tile used by the category / item rows. */
function NavIcon({ icon, tint }: { icon: keyof typeof Icons; tint: { bg: string; color: string } }) {
	const Icon = Icons[icon];
	return (
		<span className="nb-ai-prow-logo" style={{ background: tint.bg, color: tint.color }} aria-hidden="true">
			<Icon size={15} />
		</span>
	);
}

export function AiSettingsForm(props: AiSettingsFormProps) {
	const { values, info, hasStoredKey, hasStoredWebSearchKey, error } = props;
	const { models, modelsLoading, modelsError, testStatus, testResult, saveState, saveText } = props;
	const [showKey, setShowKey] = useState(false);
	const [showWebSearchKey, setShowWebSearchKey] = useState(false);
	const [activePane, setActivePane] = useState<PaneId>("ai-model");
	const { data: authUser } = useAuthUser();
	const webSearchInfo = getWebSearchProviderInfo(values.webSearchProvider);
	const { t } = useT();
	const { locale, setLocale } = useLocale();
	const { replyStyle, setReplyStyle } = useResearchPrefs();

	const categories = buildCategories(Boolean(authUser));
	const activeCategory =
		categories.find((c) => c.items.some((i) => i.id === activePane))?.id ?? "general";
	const items = categories.find((c) => c.id === activeCategory)?.items ?? [];
	// Only the AI-model / web-search panes write to the server, so the auto-save
	// hint is meaningless on the localStorage-backed panes (general / style).
	const showSaveHint = activePane === "ai-model" || activePane === "websearch";

	const keyPlaceholder = hasStoredKey
		? "已保存，留空保持不变"
		: info.keyOptional
			? "可留空，使用 NanoBee 内置额度"
			: "sk-...";

	return (
		<div className="nb-settings-3col nb-settings-split" data-testid="ai-settings-form">
			{/* Column 1: setting categories */}
			<nav className="nb-ai-master nb-set-cats" aria-label="设置分类">
				<div className="nb-ai-master-grp">设置</div>
				<div role="radiogroup" aria-label="设置分类" style={{ display: "contents" }}>
					{categories.map((cat) => {
						const selected = activeCategory === cat.id;
						return (
							<button
								key={cat.id}
								type="button"
								role="radio"
								aria-checked={selected}
								className={`nb-ai-prow${selected ? " selected" : ""}`}
								onClick={() => setActivePane(cat.items[0].id)}
								data-testid={`settings-category-${cat.id}`}
							>
								<NavIcon icon={cat.icon} tint={cat.tint} />
								<span className="nb-ai-prow-name">{cat.label}</span>
							</button>
						);
					})}
				</div>
			</nav>

			{/* Column 2: items of the active category */}
			<div className="nb-ai-master nb-set-items">
				<div className="nb-ai-master-list" role="radiogroup" aria-label={`${activeCategory} 设置项`}>
					{items.map((item) => {
						const selected = activePane === item.id;
						return (
							<button
								key={item.id}
								type="button"
								role="radio"
								aria-checked={selected}
								className={`nb-ai-prow${selected ? " selected" : ""}`}
								onClick={() => setActivePane(item.id)}
								data-testid={`settings-item-${item.id}`}
							>
								<NavIcon icon={item.icon} tint={item.tint} />
								<span className="nb-ai-prow-name">{item.label}</span>
							</button>
						);
					})}
				</div>
				{showSaveHint && saveText && (
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

			{/* Column 3: the active pane's detail */}
			<div className={`nb-ai-detail${activePane === "account" ? " nb-ai-detail--account" : ""}`}>
				{activePane === "general" ? (
					<GeneralPane locale={locale} onSetLocale={setLocale} t={t} />
				) : activePane === "ai-model" ? (
					<AiModelPane
						values={values}
						info={info}
						hasStoredKey={hasStoredKey}
						keyPlaceholder={keyPlaceholder}
						showKey={showKey}
						onToggleKey={() => setShowKey((s) => !s)}
						models={models}
						modelsLoading={modelsLoading}
						modelsError={modelsError}
						testStatus={testStatus}
						testResult={testResult}
						onProviderChange={props.onProviderChange}
						onFieldChange={props.onFieldChange}
						onFetchModels={props.onFetchModels}
						onTestConnection={props.onTestConnection}
					/>
				) : activePane === "websearch" ? (
					<WebSearchPane
						values={values}
						hasStoredWebSearchKey={hasStoredWebSearchKey}
						webSearchInfo={webSearchInfo}
						showWebSearchKey={showWebSearchKey}
						onToggleWebSearchKey={() => setShowWebSearchKey((s) => !s)}
						onFieldChange={props.onFieldChange}
					/>
				) : activePane === "notifications" ? (
					<NotificationSettings userEnabled={props.userSignedIn ?? false} />
				) : activePane === "shortcuts" ? (
					<ShortcutsSection />
				) : activePane === "account" ? (
					authUser ? <AccountSection user={authUser} /> : null
				) : activePane === "research-style" ? (
					<ResearchStylePane value={replyStyle} onChange={setReplyStyle} />
				) : activePane === "tasks-soon" ? (
					<ComingSoonPane title="任务" hint="任务相关的偏好设置。" />
				) : (
					<ComingSoonPane title="聊天" hint="聊天相关的偏好设置。" />
				)}

				{error && showSaveHint && (
					<div className="field-error" role="alert" data-testid="ai-settings-error">
						{error}
					</div>
				)}
			</div>
		</div>
	);
}

// ── AI model pane ─────────────────────────────────────────────────────────────

interface AiModelPaneProps {
	values: AiSetupFormValues;
	info: AiProviderInfo;
	hasStoredKey: boolean;
	keyPlaceholder: string;
	showKey: boolean;
	onToggleKey: () => void;
	models: string[];
	modelsLoading: boolean;
	modelsError: string | null;
	testStatus: TestStatus;
	testResult: TestConnectionResult | null;
	onProviderChange: (id: AiProviderId) => void;
	onFieldChange: AiSettingsFormProps["onFieldChange"];
	onFetchModels: () => void;
	onTestConnection: () => void;
}

/** Detail pane for the AI model: provider chip grid + key / host / model / test. */
function AiModelPane(props: AiModelPaneProps) {
	const { values, info } = props;
	return (
		<>
			<div className="nb-ai-detail-head">
				<div className="title" data-testid="ai-detail-title">
					AI 模型
				</div>
				<div className="sub">配置驱动「研究画布」与「聊天」的 AI 模型供应商，所有功能通用。</div>
			</div>

			<div className="field">
				<label className="field-label">模型供应商</label>
				<div className="nb-prov-grid" role="radiogroup" aria-label="AI 模型供应商">
					{AI_PROVIDERS.map((p) => {
						const selected = values.provider === p.id;
						return (
							<button
								key={p.id}
								type="button"
								role="radio"
								aria-checked={selected}
								className={`nb-prov-chip${selected ? " selected" : ""}`}
								onClick={() => props.onProviderChange(p.id)}
								data-testid={`ai-provider-option-${p.id}`}
							>
								<ProviderLogo id={p.id} />
								<span className="nb-prov-chip-name">{p.label}</span>
								{p.id === "openrouter" && <span className="nb-ai-prow-tag">默认</span>}
							</button>
						);
					})}
				</div>
				<p className="nb-ai-subhint" data-testid="ai-provider-hint">
					{info.hint}
				</p>
			</div>

			<div className="field">
				<label className="field-label" htmlFor="ai-api-key">
					API Key{info.keyOptional ? "（可选）" : ""}
				</label>
				<div className="nb-ai-key-wrap">
					<input
						id="ai-api-key"
						className="input"
						type={props.showKey ? "text" : "password"}
						autoComplete="new-password"
						value={values.apiKey}
						placeholder={props.keyPlaceholder}
						onChange={(e) => props.onFieldChange("apiKey", e.target.value)}
						data-testid="ai-api-key-input"
					/>
					<button
						type="button"
						className="nb-ai-key-eye"
						onClick={props.onToggleKey}
						aria-label={props.showKey ? "隐藏 API Key" : "显示 API Key"}
						data-testid="ai-api-key-toggle"
					>
						<Icons.eye size={15} />
					</button>
				</div>
			</div>

			<div className="field">
				<label className="field-label" htmlFor="ai-host">
					API Host
				</label>
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
					<label className="field-label" htmlFor="ai-model">
						模型
					</label>
					{info.canListModels && (
						<button
							type="button"
							className="nb-fetch-models"
							onClick={props.onFetchModels}
							disabled={props.modelsLoading}
							data-testid="ai-fetch-models"
						>
							<Icons.redo size={13} />
							{props.modelsLoading ? "获取中…" : "自动获取模型"}
						</button>
					)}
				</div>

				<ModelCombobox
					value={values.model}
					models={props.models}
					loading={props.modelsLoading}
					canList={info.canListModels}
					placeholder={info.defaultModel || "model-id"}
					onChange={(v) => props.onFieldChange("model", v)}
				/>
				{props.modelsError ? (
					<p className="nb-ai-subhint nb-ai-subhint-err" data-testid="ai-models-error">
						{props.modelsError}
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
						disabled={props.testStatus === "testing"}
						data-testid="ai-test-connection"
					>
						<Icons.bolt size={14} />
						{props.testStatus === "testing" ? "测试中…" : "测试连接"}
					</button>
					<TestStatusLine status={props.testStatus} result={props.testResult} />
				</div>
			</div>
		</>
	);
}

// ── Web search pane ───────────────────────────────────────────────────────────

interface WebSearchPaneProps {
	values: AiSetupFormValues;
	hasStoredWebSearchKey: boolean;
	webSearchInfo: ReturnType<typeof getWebSearchProviderInfo>;
	showWebSearchKey: boolean;
	onToggleWebSearchKey: () => void;
	onFieldChange: AiSettingsFormProps["onFieldChange"];
}

function WebSearchPane(props: WebSearchPaneProps) {
	const { values, webSearchInfo } = props;
	return (
		<>
			<div className="nb-ai-detail-head">
				<div className="title" data-testid="ai-detail-title">
					联网搜索
				</div>
				<div className="sub">为 AI 回答配置联网搜索供应商，独立于上方模型供应商。</div>
			</div>

			<div className="field">
				<label className="field-label" htmlFor="ai-web-search-provider">
					搜索供应商
				</label>
				<select
					id="ai-web-search-provider"
					className="input"
					value={values.webSearchProvider}
					onChange={(e) => props.onFieldChange("webSearchProvider", e.target.value)}
					data-testid="ai-web-search-provider-select"
				>
					{WEB_SEARCH_PROVIDERS.map((p) => (
						<option key={p.id} value={p.id}>
							{p.label}
						</option>
					))}
				</select>
			</div>

			<div className="field">
				<label className="field-label" htmlFor="ai-web-search-key">
					API Key
				</label>
				<div className="nb-ai-key-wrap">
					<input
						id="ai-web-search-key"
						className="input"
						type={props.showWebSearchKey ? "text" : "password"}
						autoComplete="new-password"
						value={values.webSearchKey}
						placeholder={
							props.hasStoredWebSearchKey
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
						onClick={props.onToggleWebSearchKey}
						aria-label={props.showWebSearchKey ? "隐藏 Web 搜索 Key" : "显示 Web 搜索 Key"}
						data-testid="ai-web-search-key-toggle"
					>
						<Icons.eye size={15} />
					</button>
				</div>
				<p className="nb-ai-subhint">{webSearchInfo.hint}</p>
			</div>
		</>
	);
}

// ── Research Canvas: reply-style pane ─────────────────────────────────────────

interface ResearchStylePaneProps {
	value: ResearchReplyStyle;
	onChange: (style: ResearchReplyStyle) => void;
}

/**
 * Picker for the AI reply style used by the Research Canvas. Selecting a style
 * re-shapes both the generated outline and the article voice (tone / depth /
 * length); the choice is browser-local and applies to all research projects.
 */
function ResearchStylePane({ value, onChange }: ResearchStylePaneProps) {
	return (
		<>
			<div className="nb-ai-detail-head">
				<div className="title" data-testid="research-style-title">
					AI 回复风格
				</div>
				<div className="sub">
					选择 AI 在「研究画布」生成大纲与文章时的语气与深度，所有研究项目通用。
				</div>
			</div>
			<div className="field">
				<div
					role="radiogroup"
					aria-label="AI 回复风格"
					className="nb-style-list"
					data-testid="research-style-options"
				>
					{RESEARCH_STYLE_OPTIONS.map((opt) => {
						const selected = value === opt.id;
						return (
							<button
								key={opt.id}
								type="button"
								role="radio"
								aria-checked={selected}
								className={`nb-style-opt${selected ? " selected" : ""}`}
								onClick={() => onChange(opt.id)}
								data-testid={`research-style-option-${opt.id}`}
							>
								<span className="nb-style-opt-main">
									<span className="nb-style-opt-label">{opt.label}</span>
									<span className="nb-style-opt-desc">{opt.description}</span>
								</span>
								<span className="nb-style-opt-check" aria-hidden="true">
									{selected && <Icons.check size={16} />}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</>
	);
}

// ── Placeholder pane (Tasks / Chat) ───────────────────────────────────────────

function ComingSoonPane({ title, hint }: { title: string; hint: string }) {
	return (
		<>
			<div className="nb-ai-detail-head">
				<div className="title">{title}</div>
				<div className="sub">{hint}</div>
			</div>
			<div className="nb-set-soon" data-testid="settings-coming-soon">
				<Icons.spark size={22} style={{ color: "var(--ink-4)" }} />
				<p>该分类的设置项正在开发中，敬请期待。</p>
			</div>
		</>
	);
}

// ── General pane (interface language + future app-wide prefs) ─────────────────

// Map locale code to its i18n key so the label itself can be translated.
const LOCALE_LABEL_KEY: Record<Locale, "settings.language.zh" | "settings.language.en"> = {
	zh: "settings.language.zh",
	en: "settings.language.en",
};

interface GeneralPaneProps {
	locale: Locale;
	onSetLocale: (locale: Locale) => void;
	t: (key: Parameters<ReturnType<typeof useT>["t"]>[0]) => string;
}

/**
 * The "通用" landing pane: app-wide preferences. Currently the interface
 * language switcher (zh / en); changing locale is instant and persisted to
 * localStorage via the LocaleContext setLocale.
 */
function GeneralPane({ locale, onSetLocale, t }: GeneralPaneProps) {
	return (
		<>
			<div className="nb-ai-detail-head">
				<div className="title" data-testid="settings-general-title">
					通用
				</div>
				<div className="sub">应用通用偏好设置。</div>
			</div>
			<div className="field">
				<label className="field-label">{t("settings.language.sectionLabel")}</label>
				<div
					role="radiogroup"
					aria-label={t("settings.language.sectionLabel")}
					style={{ display: "flex", flexDirection: "column", gap: 6 }}
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
								className={`nb-ai-prow${selected ? " selected" : ""}`}
								style={{ width: "100%" }}
								onClick={() => onSetLocale(code)}
								data-testid={`language-option-${code}`}
							>
								<span
									className="nb-ai-prow-logo"
									style={{
										background: selected ? "rgba(99,91,255,0.12)" : "var(--surface-2)",
										color: selected ? "var(--brand-2)" : "var(--ink-3)",
									}}
									aria-hidden="true"
								>
									<Icons.globe size={14} />
								</span>
								<span className="nb-ai-prow-name">{t(LOCALE_LABEL_KEY[code])}</span>
								{selected && (
									<span className="nb-ai-prow-tag" style={{ marginLeft: "auto" }}>
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
