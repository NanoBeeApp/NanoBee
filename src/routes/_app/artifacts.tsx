import { createFileRoute } from "@tanstack/react-router";
import { ArtifactsView } from "@/components/artifacts/ArtifactsView";

// /artifacts — the card-deck gallery generated from chat.
export const Route = createFileRoute("/_app/artifacts")({
	component: ArtifactsView,
});
