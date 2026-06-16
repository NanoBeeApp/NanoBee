import { createFileRoute } from "@tanstack/react-router";
import { TodayView } from "@/components/today/TodayView";
import { RouteErrorFallback } from "@/components/common/ErrorBoundary";

// /today — the proactive "今日事项" reading surface.
export const Route = createFileRoute("/_app/today")({
	component: TodayView,
	errorComponent: ({ error, reset }) => (
		<RouteErrorFallback error={error instanceof Error ? error : new Error(String(error))} reset={reset} />
	),
});
