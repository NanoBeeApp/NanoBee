import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat/ChatView";
import { CompareView } from "@/components/compare/CompareView";
import { RouteErrorFallback } from "@/components/common/ErrorBoundary";

// Home page (/): the main chat surface. `?compare=1` opens the multi-model
// compare view as a SECOND-LEVEL page inside the chat page (not a separate
// top-level route) — entered from the chat composer and dismissed back to chat.
// models / q / sync carry the compare view's bookmarkable state.
export interface IndexSearch {
	/** "1" opens the compare sub-page over the chat. */
	compare?: string;
	/** Comma-joined `provider:model` tokens — the compare column set. */
	models?: string;
	/** Initial compare prompt to auto-run once (shareable replay). */
	q?: string;
	/** "1" when compare sync-scroll is on. */
	sync?: string;
}

function IndexView() {
	const { compare } = Route.useSearch();
	return compare ? <CompareView /> : <ChatView />;
}

export const Route = createFileRoute("/_app/")({
	// Accept both a bare `1` (number, e.g. a hand-typed ?compare=1) and the
	// quoted "1" the router emits for a string flag — TanStack JSON-parses search
	// values, so `1` arrives as a number. Truthy → on.
	validateSearch: (search: Record<string, unknown>): IndexSearch => ({
		compare: search.compare ? "1" : undefined,
		models:
			typeof search.models === "string" && search.models ? search.models : undefined,
		q: search.q != null && search.q !== "" ? String(search.q) : undefined,
		sync: search.sync ? "1" : undefined,
	}),
	component: IndexView,
	errorComponent: ({ error, reset }) => (
		<RouteErrorFallback error={error instanceof Error ? error : new Error(String(error))} reset={reset} />
	),
});
