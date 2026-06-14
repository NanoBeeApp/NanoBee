// Pathless layout route that owns the whole app shell (sidebar | center |
// docked right chat panel) plus the global overlay layers. Every in-app page
// (chat / today / tasks / artifacts / research / settings) renders into the
// <Outlet/> inside the center surface, so each one has its own URL while
// sharing this chrome.
//
// The URL is the source of truth for "which view": this layout mirrors the
// active pathname into the store's cached `view` and bridges the router's
// navigate() into the store so navigation actions can change the URL.
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
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { QuickChat } from "@/components/quickchat/QuickChat";
import { SelectionFloat } from "@/components/selection/SelectionFloat";
import { ToastStack } from "@/components/feedback/ToastStack";

// Client-only: the shell is interactive state (zustand + window listeners) with
// no SEO-relevant static content. ssr:false here covers the whole subtree.
export const Route = createFileRoute("/_app")({
	ssr: false,
	component: AppLayout,
});

function AppLayout() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const view = useAppStore((s) => s.view);
	const sideCollapsed = useAppStore((s) => s.sideCollapsed);
	const sidePeek = useAppStore((s) => s.sidePeek);
	const researchPhase = useResearchStore((s) => s.phase);
	const notifOpen = useAppStore((s) => s.notifOpen);
	const newChat = useAppStore((s) => s.newChat);
	const bootstrap = useAppStore((s) => s.bootstrap);
	const bindNavigate = useAppStore((s) => s.bindNavigate);
	const syncView = useAppStore((s) => s.syncView);

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

	// ⌘N / Ctrl+N starts a new chat (shortcut shown on the sidebar button).
	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
				e.preventDefault();
				newChat();
			}
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [newChat]);

	// The quick-chat widget floats over content as a bottom-right bubble + popup
	// (see QuickChat), so the shell no longer reserves a grid column for it.

	// On the research canvas (the live canvas phase, not the welcome screen) the
	// left rail floats over a full-width, position-stable canvas: opening/closing
	// the sidebar must never resize or shift the canvas. The `research-canvas`
	// class flips the grid to a single column and turns the rail into a fixed
	// overlay (see app.css). Welcome phase keeps the normal squeeze layout.
	const researchCanvasFloating =
		view === "research" && researchPhase === "canvas";

	return (
		<div
			className={`nb-app${sideCollapsed ? " side-collapsed" : ""}${sideCollapsed && sidePeek ? " side-peek" : ""}${researchCanvasFloating ? " research-canvas" : ""}`}
			data-testid="nanobee-app"
		>
			<Sidebar />

			<section className="nb-chat" data-testid="center-surface">
				<FloatingControls />
				<Outlet />
				{notifOpen && <NotificationDropdown />}
			</section>

			<QuickChat />
			<SelectionFloat />
			<ToastStack />
		</div>
	);
}
