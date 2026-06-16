import { createFileRoute } from "@tanstack/react-router";
import { TasksView } from "@/components/tasks/TasksView";
import { RouteErrorFallback } from "@/components/common/ErrorBoundary";

// Search params are the bookmarkable source of truth for the Tasks page:
//   view   — 'home' (clean single-focus first screen, default when absent) |
//            'all' (the secondary "全部任务" manager with view switch + filters).
//   vm     — manager view mode: 'list' (default) | 'table' | 'board'.
//   task   — the open task's id; absent → no detail drawer.
//   f      — manager filter: 'all' (default) | a TaskKind | a topic id.
//   upload — 'open' while the batch-upload dialog is open (a non-numeric token
//            so the round-trip-safe search serializer keeps the URL clean).
//   tpl    — template picker open: the active category id (or 'all'); absent → picker closed.
// A refresh / deep link / back-forward restores the same surface, view mode,
// open drawer, filter and dialog (see useTasksUrl).
export type TasksViewMode = "list" | "table" | "board";
export type TasksSurface = "home" | "all";

export interface TasksSearch {
	view?: TasksSurface;
	vm?: TasksViewMode;
	task?: string;
	f?: string;
	upload?: "open";
	/** Template picker: active category id (or 'all'). Absent when picker is closed. */
	tpl?: string;
}

export const Route = createFileRoute("/_app/tasks")({
	validateSearch: (search: Record<string, unknown>): TasksSearch => ({
		view: search.view === "all" ? "all" : undefined,
		vm:
			search.vm === "table" || search.vm === "board" || search.vm === "list"
				? search.vm
				: undefined,
		task: typeof search.task === "string" && search.task ? search.task : undefined,
		f: typeof search.f === "string" && search.f ? search.f : undefined,
		upload: search.upload === "open" ? "open" : undefined,
		tpl: typeof search.tpl === "string" && search.tpl ? search.tpl : undefined,
	}),
	component: TasksView,
	errorComponent: ({ error, reset }) => (
		<RouteErrorFallback error={error instanceof Error ? error : new Error(String(error))} reset={reset} />
	),
});
