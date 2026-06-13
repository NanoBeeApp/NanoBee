// State container for the AI provider setup dialog.
// Shows automatically on first login (signed-in user with no saved settings)
// and on demand via the account menu (store flag aiSetupOpen). Owns form
// state + validation and delegates rendering to AiProviderSetupForm.

import { useCallback, useEffect, useRef, useState } from "react";
import { getProviderInfo, type AiProviderId } from "../../lib/ai-providers";
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
import { useAppStore } from "../../store/useAppStore";
import {
	AiProviderSetupForm,
	type AiSetupFormValues,
	type TestStatus,
} from "./AiProviderSetupForm";

function initialValues(settings: AiSettings | null): AiSetupFormValues {
	const provider = settings?.provider ?? "openrouter";
	const info = getProviderInfo(provider);
	return {
		provider,
		apiKey: "",
		baseUrl: settings?.baseUrl || info.defaultBaseUrl,
		model: settings?.model || info.defaultModel,
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
		// Store "" when the user kept the provider default, so future
		// default updates apply automatically.
		baseUrl: baseUrl === info.defaultBaseUrl ? "" : baseUrl,
		model: model === info.defaultModel ? "" : model,
		// Blank input keeps a stored key; otherwise it means "no own key".
		apiKey: apiKey !== "" ? apiKey : hasStoredKey ? undefined : "",
		webSearchKey:
			webSearchKey !== "" ? webSearchKey : hasStoredWebSearchKey ? undefined : "",
	};
}

export function AiProviderSetupDialog() {
	const { data: user } = useAuthUser();
	const settingsQuery = useAiSettings(Boolean(user));
	const manualOpen = useAppStore((s) => s.aiSetupOpen);
	const setAiSetupOpen = useAppStore((s) => s.setAiSetupOpen);
	const toast = useAppStore((s) => s.toast);
	const save = useSaveAiSettings();

	const data = settingsQuery.data ?? null;
	const isFirstSetup = Boolean(user) && data !== null && !data.configured;
	const visible = Boolean(user) && data !== null && (isFirstSetup || manualOpen);

	if (!visible) return null;

	return (
		<AiSetupFormState
			key={`${data.configured}-${manualOpen}`}
			settings={data.settings}
			isFirstSetup={isFirstSetup}
			saving={save.isPending}
			onClose={() => setAiSetupOpen(false)}
			onSave={async (input) => {
				await save.mutateAsync(input);
				setAiSetupOpen(false);
				toast("AI 模型设置已保存");
			}}
		/>
	);
}

interface AiSetupFormStateProps {
	settings: AiSettings | null;
	isFirstSetup: boolean;
	saving: boolean;
	onClose: () => void;
	onSave: (input: SaveAiSettingsInput) => Promise<void>;
}

function AiSetupFormState(props: AiSetupFormStateProps) {
	const [values, setValues] = useState<AiSetupFormValues>(() =>
		initialValues(props.settings),
	);
	const [error, setError] = useState<string | null>(null);
	const [models, setModels] = useState<string[]>([]);
	const [modelsError, setModelsError] = useState<string | null>(null);
	const [testStatus, setTestStatus] = useState<TestStatus>("idle");
	const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
	const fetchModels = useFetchModels();
	const testConnection = useTestConnection();

	const info = getProviderInfo(values.provider);
	const hasStoredKey = Boolean(
		props.settings?.hasApiKey && props.settings.provider === values.provider,
	);
	// The web-search key is provider-independent — switching providers keeps it.
	const hasStoredWebSearchKey = Boolean(props.settings?.hasWebSearchKey);

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
		setError(null);
		// Switching providers invalidates the previous model list and test result,
		// and re-seeds host/model with the new provider's defaults.
		setModels([]);
		setModelsError(null);
		setTestStatus("idle");
		setTestResult(null);
		setValues((v) => ({ ...v, provider: id, baseUrl: next.defaultBaseUrl, model: next.defaultModel }));
	};

	const handleSubmit = async () => {
		const apiKey = values.apiKey.trim();
		if (info.id === "custom" && !values.baseUrl.trim()) {
			setError("自定义供应商需要填写 API Host");
			return;
		}
		if (!info.keyOptional && !apiKey && !hasStoredKey) {
			setError(`${info.label} 需要填写 API Key`);
			return;
		}
		setError(null);
		try {
			await props.onSave(toSaveInput(values, hasStoredKey, hasStoredWebSearchKey));
		} catch (e) {
			setError(e instanceof Error ? e.message : "保存失败，请稍后重试");
		}
	};

	const handleSkip = async () => {
		setError(null);
		try {
			// "Use defaults": OpenRouter + DeepSeek V4 Flash on the built-in key.
			await props.onSave({ provider: "openrouter", apiKey: "", baseUrl: "", model: "" });
		} catch (e) {
			setError(e instanceof Error ? e.message : "保存失败，请稍后重试");
		}
	};

	return (
		<AiProviderSetupForm
			values={values}
			info={info}
			hasStoredKey={hasStoredKey}
			hasStoredWebSearchKey={hasStoredWebSearchKey}
			isFirstSetup={props.isFirstSetup}
			saving={props.saving}
			error={error}
			models={models}
			modelsLoading={fetchModels.isPending}
			modelsError={modelsError}
			testStatus={testStatus}
			testResult={testResult}
			onProviderChange={handleProviderChange}
			onFieldChange={(field, value) => {
				// Editing the key/host/model invalidates any prior test result.
				if (testStatus !== "idle") {
					setTestStatus("idle");
					setTestResult(null);
				}
				setValues((v) => ({ ...v, [field]: value }));
			}}
			onFetchModels={() => void runFetchModels(values.provider, values.apiKey, values.baseUrl)}
			onTestConnection={() => void handleTestConnection()}
			onSubmit={() => void handleSubmit()}
			onSkip={() => void handleSkip()}
			onClose={props.isFirstSetup ? () => undefined : props.onClose}
		/>
	);
}
