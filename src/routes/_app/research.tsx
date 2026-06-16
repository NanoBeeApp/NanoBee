import { createFileRoute } from "@tanstack/react-router";
import { ResearchView } from "@/components/research/ResearchView";
import { RouteErrorFallback } from "@/components/common/ErrorBoundary";

// Search params are the bookmarkable source of truth for the research view's
// state (see useResearchUrlSync): which project is open and which node's
// reading overlay is open.
export interface ResearchSearch {
	/** Loaded project id (`rp_…`); absent → the welcome screen. */
	project?: string;
	/** Open reading-overlay node id (`rn_…`); absent → no overlay. */
	node?: string;
}

// /research — the research canvas.
export const Route = createFileRoute("/_app/research")({
	validateSearch: (search: Record<string, unknown>): ResearchSearch => ({
		project:
			typeof search.project === "string" && search.project ? search.project : undefined,
		node: typeof search.node === "string" && search.node ? search.node : undefined,
	}),
	component: ResearchView,
	errorComponent: ({ error, reset }) => (
		<RouteErrorFallback error={error instanceof Error ? error : new Error(String(error))} reset={reset} />
	),
});
