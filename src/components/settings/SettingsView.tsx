// State container for the /settings page (formerly the AI provider modal).
// Owns the data fetching (auth + saved settings) and the form state + autosave,
// delegating the master-detail layout to AiSettingsForm. Settings are optional:
// the backend falls back to NanoBee's built-in defaults when nothing is saved,
// so there is no forced onboarding — this is just a normal page reachable from
// the sidebar, and edits auto-save as you type.
//
// Change history:
//   2026-06-15  Wired i18n Phase 1: page title, subtitle, loading/signed-out
//               states and login button now use useT() strings.

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Icons } from "../../icons/icons";
import { useT } from "../../lib/i18n/LocaleContext";
import {
	DEFAULT_WEB_SEARCH_PROVIDER,
	getProviderInfo,
	type AiProviderId,
	type WebSearchProviderId,
} from "../../lib/ai-providers";
import { useAuthUser } from "../../lib/useAuth";
import {
	useAiSettings,
	useFetchModels,
	useSaveAiSettings,
	useTestConnection,
	type AiSettings,
	type SaveAiSettingsInput,
	type TestConnectionResult,
} from "../../lib/useAiSettings";
import {
	AiSettingsForm,
	type AiSetupFormValues,
	type SaveState,
	type TestStatus,
} from "./AiSettingsForm";

/** Debounce window before an edit is persisted (ms). */
const AUTOSAVE_DELAY = 700;

/** Human-readable text for the inline auto-save status line. */
function saveStateText(state: SaveState, invalidMsg: string | null): string {
	switch (state) {
		case "saving":
			return "保存中…";
		case "saved":
			return "已自动保存";
		case "error":
			return "保存失败，请重试";
		case "invalid":
			return invalidMsg ?? "请补全必填项";
		default:
			return "";
	}
}

function initialValues(settings: AiSettings | null): AiSetupFormValues {
	const provider = settings?.provider ?? "openrouter";
	const info = getProviderInfo(provider);
	return {
		provider,
		apiKey: "",
		baseUrl: settings?.baseUrl || info.defaultBaseUrl,
		model: settings?.model || info.defaultModel,
		webSearchProvider: settings?.webSearchProvider ?? DEFAULT_WEB_SEARCH_PROVIDER,
		webSearchKey: "",
	};
}

/** Normalize a form into the PUT payload ("" fields mean "use defaults"). */
function toSaveInput(
	values: AiSetupFormValues,
	hasStoredKey: boolean,
	hasStoredWebSearchKey: boolean,
): SaveAiSettingsInput {
	const info = getProviderInfo(values.provider);
	const baseUrl = values.baseUrl.trim();
	const model = values.model.trim();
	const apiKey = values.apiKey.trim();
	const webSearchKey = values.webSearchKey.trim();
	return {
		provider: values.provider,
		// Store "" when the user kept the provider default, so future default
		// updates apply automatically.
		baseUrl: baseUrl === info.defaultBaseUrl ? "" : baseUrl,
		model: model === info.defaultModel ? "" : model,
		// Blank input keeps a stored key; otherwise it means "no own key".
		apiKey: apiKey !== "" ? apiKey : hasStoredKey ? undefined : "",
		webSearchProvider: values.webSearchProvider,
		webSearchKey:
			webSearchKey !== "" ? webSearchKey : hasStoredWebSearchKey ? undefined : "",
	};
}

export function SettingsView() {
	const { data: user, isLoading: authLoading } = useAuthUser();
	const settingsQuery = useAiSettings(Boolean(user));
	const save = useSaveAiSettings();
	const { t } = useT();

	return (
		<div className="nb-settings-page" data-testid="settings-page">
			{authLoading || (user && settingsQuery.isLoading) ? (
				<div className="nb-settings-state" data-testid="settings-loading">
					<Icons.spark size={22} style={{ color: "var(--ink-4)" }} />
					<p>{t('settings.loading')}</p>
				</div>
			) : !user ? (
				<div className="nb-settings-state" data-testid="settings-signed-out">
					<Icons.bee size={26} sw={1.6} style={{ color: "var(--brand-2)" }} />
					<p>{t('settings.signedOut')}</p>
					<Link to="/login" className="btn btn-primary" data-testid="settings-login-link">
						{t('settings.loginButton')}
					</Link>
				</div>
			) : (
				<SettingsFormState
					settings={settingsQuery.data?.settings ?? null}
					onPersist={(input) => save.mutateAsync(input)}
				/>
			)}
		</div>
	);
}

interface SettingsFormStateProps {
	settings: AiSettings | null;
	/** Persist settings (used by auto-save). */
	onPersist: (input: SaveAiSettingsInput) => Promise<unknown>;
}

function SettingsFormState(props: SettingsFormStateProps) {
	const [values, setValues] = useState<AiSetupFormValues>(() =>
		initialValues(props.settings),
	);
	const [error, setError] = useState<string | null>(null);
	const [models, setModels] = useState<string[]>([]);
	const [modelsError, setModelsError] = useState<string | null>(null);
	const [testStatus, setTestStatus] = useState<TestStatus>("idle");
	const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
	const [saveState, setSaveState] = useState<SaveState>("idle");
	const [invalidMsg, setInvalidMsg] = useState<string | null>(null);
	const fetchModels = useFetchModels();
	const testConnection = useTestConnection();

	const info = getProviderInfo(values.provider);
	const hasStoredKey = Boolean(
		props.settings?.hasApiKey && props.settings.provider === values.provider,
	);
	// The stored web-search key belongs to its provider — only treat it as
	// "on file" while that provider is still selected.
	const hasStoredWebSearchKey = Boolean(
		props.settings?.hasWebSearchKey &&
			props.settings.webSearchProvider === values.webSearchProvider,
	);

	// A usable key exists when the user typed one, a key is on file for this
	// provider, or the provider rides on NanoBee's built-in key (OpenRouter).
	const hasUsableKey = Boolean(values.apiKey.trim()) || hasStoredKey || info.keyOptional;

	const runFetchModels = useCallback(
		async (provider: AiProviderId, apiKey: string, baseUrl: string) => {
			const target = getProviderInfo(provider);
			if (!target.canListModels) return;
			setModelsError(null);
			try {
				const list = await fetchModels.mutateAsync({
					provider,
					apiKey: apiKey.trim() || undefined,
					baseUrl: baseUrl.trim() || undefined,
				});
				setModels(list);
				if (list.length === 0) setModelsError("供应商未返回任何模型");
			} catch (e) {
				setModels([]);
				setModelsError(e instanceof Error ? e.message : "获取模型列表失败");
			}
		},
		[fetchModels],
	);

	const handleTestConnection = async () => {
		setTestStatus("testing");
		setTestResult(null);
		try {
			const result = await testConnection.mutateAsync({
				provider: values.provider,
				apiKey: values.apiKey.trim() || undefined,
				baseUrl: values.baseUrl.trim() || undefined,
				model: values.model.trim() || undefined,
			});
			setTestResult(result);
			setTestStatus(result.ok ? "success" : "error");
		} catch (e) {
			setTestResult({ ok: false, error: e instanceof Error ? e.message : "连接测试失败" });
			setTestStatus("error");
		}
	};

	// Auto-fetch once on open when a key is already usable, so returning users
	// see their model list without an extra click. Manual refresh covers the rest.
	const didAutoFetch = useRef(false);
	useEffect(() => {
		if (didAutoFetch.current) return;
		didAutoFetch.current = true;
		if (hasUsableKey && info.canListModels) {
			void runFetchModels(values.provider, values.apiKey, values.baseUrl);
		}
		// Intentionally one-shot on mount; later fetches are explicit.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleProviderChange = (id: AiProviderId) => {
		const next = getProviderInfo(id);
		dirtyRef.current = true;
		setError(null);
		// Switching providers invalidates the previous model list and test result,
		// and re-seeds host/model with the new provider's defaults.
		setModels([]);
		setModelsError(null);
		setTestStatus("idle");
		setTestResult(null);
		setValues((v) => ({ ...v, provider: id, baseUrl: next.defaultBaseUrl, model: next.defaultModel }));
	};

	// Validate the current form; returns an error message or null when savable.
	const validate = useCallback((): string | null => {
		if (info.id === "custom" && !values.baseUrl.trim()) {
			return "自定义供应商需要填写 API Host";
		}
		if (!info.keyOptional && !values.apiKey.trim() && !hasStoredKey) {
			return `${info.label} 需要填写 API Key`;
		}
		return null;
	}, [info, values.apiKey, values.baseUrl, hasStoredKey]);

	// Instant auto-save: debounce edits and persist whenever the form is valid
	// and the payload actually changed. The initial mount is skipped so simply
	// opening the page never writes.
	const dirtyRef = useRef(false);
	const lastSavedRef = useRef<string | null>(null);
	useEffect(() => {
		if (!dirtyRef.current) return;
		const err = validate();
		if (err) {
			setSaveState("invalid");
			setInvalidMsg(err);
			return;
		}
		setInvalidMsg(null);
		const input = toSaveInput(values, hasStoredKey, hasStoredWebSearchKey);
		const serialized = JSON.stringify(input);
		if (serialized === lastSavedRef.current) {
			setSaveState("saved");
			return;
		}
		setSaveState("saving");
		const timer = setTimeout(async () => {
			try {
				await props.onPersist(input);
				lastSavedRef.current = serialized;
				setError(null);
				setSaveState("saved");
			} catch (e) {
				setError(e instanceof Error ? e.message : "保存失败，请稍后重试");
				setSaveState("error");
			}
		}, AUTOSAVE_DELAY);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [values, hasStoredKey, hasStoredWebSearchKey]);

	return (
		<AiSettingsForm
			values={values}
			info={info}
			hasStoredKey={hasStoredKey}
			hasStoredWebSearchKey={hasStoredWebSearchKey}
			error={error}
			models={models}
			modelsLoading={fetchModels.isPending}
			modelsError={modelsError}
			testStatus={testStatus}
			testResult={testResult}
			saveState={saveState}
			saveText={saveStateText(saveState, invalidMsg)}
			onProviderChange={handleProviderChange}
			onFieldChange={(field, value) => {
				dirtyRef.current = true;
				// Editing the key/host/model invalidates any prior test result.
				if (testStatus !== "idle") {
					setTestStatus("idle");
					setTestResult(null);
				}
				setValues((v) =>
					field === "webSearchProvider"
						? // The typed key belonged to the old provider — clear it so the
						  // new provider starts blank (stored-key keep/clear stays correct).
						  { ...v, webSearchProvider: value as WebSearchProviderId, webSearchKey: "" }
						: { ...v, [field]: value },
				);
			}}
			onFetchModels={() => void runFetchModels(values.provider, values.apiKey, values.baseUrl)}
			onTestConnection={() => void handleTestConnection()}
			userSignedIn={true}
		/>
	);
}
