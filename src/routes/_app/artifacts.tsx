import { createFileRoute } from "@tanstack/react-router";
import { ArtifactsView } from "@/components/artifacts/ArtifactsView";
import { RouteErrorFallback } from "@/components/common/ErrorBoundary";

// Search params are the bookmarkable source of truth for the Artifacts page:
//   tab      — which top tab is active: 'mine' (你创建的) | 'favorites'
//              (你收藏的) | a category id ('finance' | 'tech' | …).
//   artifact — the open artifact's id (`art_…`); absent → the tabbed gallery.
//   vm       — the gallery view mode: 'list' (default) | 'table' | 'card'.
// The page mirrors these to the store (see useArtifactsUrlSync) so a refresh /
// deep link / back-forward restores the same tab, open deck and view mode.
export type ArtifactsViewMode = "list" | "table" | "card";

export interface ArtifactsSearch {
	tab?: string;
	artifact?: string;
	vm?: ArtifactsViewMode;
}

// /artifacts — the card-deck gallery generated from chat, now with browse tabs.
export const Route = createFileRoute("/_app/artifacts")({
	validateSearch: (search: Record<string, unknown>): ArtifactsSearch => ({
		tab: typeof search.tab === "string" && search.tab ? search.tab : undefined,
		artifact:
			typeof search.artifact === "string" && search.artifact
				? search.artifact
				: undefined,
		vm:
			search.vm === "table" || search.vm === "card" || search.vm === "list"
				? search.vm
				: undefined,
	}),
	component: ArtifactsView,
	errorComponent: ({ error, reset }) => (
		<RouteErrorFallback error={error instanceof Error ? error : new Error(String(error))} reset={reset} />
	),
});
