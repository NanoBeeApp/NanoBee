import { createFileRoute } from "@tanstack/react-router";
import { TodayView } from "@/components/today/TodayView";

// /today — the proactive "今日事项" reading surface.
export const Route = createFileRoute("/_app/today")({
	component: TodayView,
});
