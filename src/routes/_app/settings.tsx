import { createFileRoute } from "@tanstack/react-router";
import { SettingsView } from "@/components/settings/SettingsView";
import { RouteErrorFallback } from "@/components/common/ErrorBoundary";

// /settings — AI model & web-search configuration. Formerly a modal dialog,
// now a first-class page with its own URL.
export const Route = createFileRoute("/_app/settings")({
	component: SettingsView,
	errorComponent: ({ error, reset }) => (
		<RouteErrorFallback error={error instanceof Error ? error : new Error(String(error))} reset={reset} />
	),
});
