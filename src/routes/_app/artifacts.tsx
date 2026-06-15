import { createFileRoute } from "@tanstack/react-router";
import { ArtifactsView } from "@/components/artifacts/ArtifactsView";

// Search params are the bookmarkable source of truth for the Artifacts page:
//   tab      — which top tab is active: 'mine' (你创建的) | 'favorites'
//              (你收藏的) | a category id ('finance' | 'tech' | …).
//   artifact — the open artifact's id (`art_…`); absent → the tabbed gallery.
// The page mirrors these to the store (see useArtifactsUrlSync) so a refresh /
// deep link / back-forward restores the same tab and open deck.
export interface ArtifactsSearch {
	tab?: string;
	artifact?: string;
}

// /artifacts — the card-deck gallery generated from chat, now with browse tabs.
export const Route = createFileRoute("/_app/artifacts")({
	validateSearch: (search: Record<string, unknown>): ArtifactsSearch => ({
		tab: typeof search.tab === "string" && search.tab ? search.tab : undefined,
		artifact:
			typeof search.artifact === "string" && search.artifact
				? search.artifact
				: undefined,
	}),
	component: ArtifactsView,
});
