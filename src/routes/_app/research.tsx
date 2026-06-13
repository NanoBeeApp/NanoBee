import { createFileRoute } from "@tanstack/react-router";
import { ResearchView } from "@/components/research/ResearchView";

// /research — the research canvas.
export const Route = createFileRoute("/_app/research")({
	component: ResearchView,
});
