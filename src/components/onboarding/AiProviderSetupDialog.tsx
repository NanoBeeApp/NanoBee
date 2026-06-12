// State container for the AI provider setup dialog.
// Shows automatically on first login (signed-in user with no saved settings)
// and on demand via the account menu (store flag aiSetupOpen). Owns form
// state + validation and delegates rendering to AiProviderSetupForm.

import { useState } from "react";
import { getProviderInfo, type AiProviderId } from "../../lib/ai-providers";
import { useAuthUser } from "../../lib/useAuth";
import {
	useAiSettings,
	useSaveAiSettings,
	type AiSettings,
	type SaveAiSettingsInput,
} from "../../lib/useAiSettings";
import { useAppStore } from "../../store/useAppStore";
import { AiProviderSetupForm, type AiSetupFormValues } from "./AiProviderSetupForm";

function initialValues(settings: AiSettings | null): AiSetupFormValues {
	const provider = settings?.provider ?? "openrouter";
	const info = getProviderInfo(provider);
	return {
		provider,
		apiKey: "",
		baseUrl: settings?.baseUrl || info.defaultBaseUrl,
		model: settings?.model || info.defaultModel,
	};
}

/** Normalize a form into the PUT payload ("" fields mean "use defaults"). */
function toSaveInput(
	values: AiSetupFormValues,
	hasStoredKey: boolean,
): SaveAiSettingsInput {
	const info = getProviderInfo(values.provider);
	const baseUrl = values.baseUrl.trim();
	const model = values.model.trim();
	const apiKey = values.apiKey.trim();
	return {
		provider: values.provider,
		// Store "" when the user kept the provider default, so future
		// default updates apply automatically.
		baseUrl: baseUrl === info.defaultBaseUrl ? "" : baseUrl,
		model: model === info.defaultModel ? "" : model,
		// Blank input keeps a stored key; otherwise it means "no own key".
		apiKey: apiKey !== "" ? apiKey : hasStoredKey ? undefined : "",
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

	const info = getProviderInfo(values.provider);
	const hasStoredKey = Boolean(
		props.settings?.hasApiKey && props.settings.provider === values.provider,
	);

	const handleProviderChange = (id: AiProviderId) => {
		const next = getProviderInfo(id);
		setError(null);
		// Switching providers re-seeds host/model with that provider's defaults.
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
			await props.onSave(toSaveInput(values, hasStoredKey));
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
			isFirstSetup={props.isFirstSetup}
			saving={props.saving}
			error={error}
			onProviderChange={handleProviderChange}
			onFieldChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))}
			onSubmit={() => void handleSubmit()}
			onSkip={() => void handleSkip()}
			onClose={props.isFirstSetup ? () => undefined : props.onClose}
		/>
	);
}
