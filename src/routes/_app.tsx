// Pathless layout route that owns the whole app shell (sidebar | center |
// docked right chat panel) plus the global overlay layers. Every in-app page
// (chat / today / tasks / artifacts / research / settings) renders into the
// <Outlet/> inside the center surface, so each one has its own URL while
// sharing this chrome.
//
// The URL is the source of truth for "which view": this layout mirrors the
// active pathname into the store's cached `view` and bridges the router's
// navigate() into the store so navigation actions can change the URL.
//
// Change history:
//   2026-06-15  Mobile-responsive pass: MobileHeader + off-canvas drawer scrim;
//               `mobile-nav-open` class on .nb-app; RouteErrorFallback as
//               errorComponent for per-route crash isolation.
//   2026-06-15  Added first-run Onboarding overlay (migration 0017).
import { useEffect, useLayoutEffect } from "react";
import {
	Outlet,
	createFileRoute,
	useNavigate,
	useRouterState,
} from "@tanstack/react-router";
import { useAppStore, viewFromPath } from "@/store/useAppStore";
import { useResearchStore } from "@/store/useResearchStore";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { FloatingControls } from "@/components/layout/FloatingControls";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { QuickChat } from "@/components/quickchat/QuickChat";
import { SelectionFloat } from "@/components/selection/SelectionFloat";
import { ToastStack } from "@/components/feedback/ToastStack";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { RouteErrorFallback } from "@/components/common/ErrorBoundary";
import "@/styles/onboarding.css";

// Client-only: the shell is interactive state (zustand + window listeners) with
// no SEO-relevant static content. ssr:false here covers the whole subtree.
export const Route = createFileRoute("/_app")({
	ssr: false,
	component: AppLayout,
	errorComponent: ({ error, reset }) => (
		<RouteErrorFallback error={error instanceof Error ? error : new Error(String(error))} reset={reset} />
	),
});

function AppLayout() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const view = useAppStore((s) => s.view);
	const sideCollapsed = useAppStore((s) => s.sideCollapsed);
	const sidePeek = useAppStore((s) => s.sidePeek);
	const rightCollapsed = useAppStore((s) => s.rightCollapsed);
	const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
	const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
	const researchPhase = useResearchStore((s) => s.phase);
	const notifOpen = useAppStore((s) => s.notifOpen);
	const newForView = useAppStore((s) => s.newForView);
	const bootstrap = useAppStore((s) => s.bootstrap);
	const bindNavigate = useAppStore((s) => s.bindNavigate);
	const syncView = useAppStore((s) => s.syncView);
	const onboardingDone = useAppStore((s) => s.onboardingDone);
	const tasks = useAppStore((s) => s.tasks);
	// Show the onboarding overlay once bootstrap has run (onboardingDone is false
	// initially set to true to avoid flash) and the user has no tasks yet.
	const showOnboarding = !onboardingDone && tasks.length === 0;

	// Bridge navigate() into the store (once — useNavigate is stable).
	// `to` is a plain string here; cast past the router's typed-route union.
	useEffect(() => {
		bindNavigate((to) => {
			void navigate({ to: to as never });
		});
	}, [bindNavigate, navigate]);

	// Mirror the URL into the cached `view` before paint, so the sidebar active
	// state never lags a deep-link or a browser back/forward navigation.
	useLayoutEffect(() => {
		syncView(viewFromPath(pathname));
	}, [pathname, syncView]);

	// Load the persisted server state from D1 into the (initially empty) store.
	useEffect(() => {
		void bootstrap();
	}, [bootstrap]);

	// ⌘N / Ctrl+N triggers the current page's "new" action (chat / task /
	// artifact / research), matching the page-aware sidebar button.
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
				e.preventDefault();
				newForView();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [newForView]);

	// The quick-chat sidebar docks on the right of every non-chat surface
	// (see QuickChat). Reserve a grid column for it when it's expanded; when it's
	// collapsed the column drops away and only its slim re-open tab is shown. The
	// `withRightChat` condition must match QuickChat's own `hidden` guard.
	const withRightChat = view !== "chat" && view !== "settings";

	// On the research canvas (the live canvas phase, not the welcome screen) the
	// left rail floats over a full-width, position-stable canvas: opening/closing
	// the sidebar must never resize or shift the canvas. The `research-canvas`
	// class flips the grid to a single column and turns the rail into a fixed
	// overlay (see app.css). Welcome phase keeps the normal squeeze layout.
	const researchCanvasFloating =
		view === "research" && researchPhase === "canvas";

	return (
		<div
			className={[
				"nb-app",
				sideCollapsed ? "side-collapsed" : "",
				sideCollapsed && sidePeek ? "side-peek" : "",
				withRightChat ? "with-rightchat" : "",
				withRightChat && rightCollapsed ? "right-collapsed" : "",
				researchCanvasFloating ? "research-canvas" : "",
				mobileNavOpen ? "mobile-nav-open" : "",
			].filter(Boolean).join(" ")}
			data-testid="nanobee-app"
		>
			{/* Mobile-only top header (hamburger + brand + account); hidden on desktop */}
			<MobileHeader />

			<Sidebar />

			{/* Scrim shown behind the off-canvas sidebar drawer on mobile */}
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: tap-to-close overlay */}
			<div
				className="nb-drawer-scrim"
				aria-hidden="true"
				onClick={() => setMobileNavOpen(false)}
			/>

			<section className="nb-chat" data-testid="center-surface">
				<FloatingControls />
				<Outlet />
				{notifOpen && <NotificationDropdown />}
			</section>

			<QuickChat />
			<SelectionFloat />
			<ToastStack />
			{showOnboarding && <Onboarding />}
		</div>
	);
}
