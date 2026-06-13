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
	const rightCollapsed = useAppStore((s) => s.rightCollapsed);
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

	// The docked right chat panel rides on the content surfaces only; the chat
	// page has its own full-width composer and settings is a configuration page.
	const withRightChat = view !== "chat" && view !== "settings";

	return (
		<div
			className={`nb-app${withRightChat ? " with-rightchat" : ""}${sideCollapsed ? " side-collapsed" : ""}${sideCollapsed && sidePeek ? " side-peek" : ""}${rightCollapsed ? " right-collapsed" : ""}`}
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
