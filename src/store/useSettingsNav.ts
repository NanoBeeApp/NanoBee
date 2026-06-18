// Shared selection state for the /settings surface.
// The settings categories now live in the left app sidebar (SettingsNavList)
// while the items + detail panes stay on the page (AiSettingsForm). Both read
// and write the active pane here so clicking a category in the sidebar drives
// the page, and the page's item list / detail reflect the sidebar selection.
//
// It's a tiny in-memory zustand store (no persistence): the selection only needs
// to survive while the app is mounted, mirroring how the page held this in local
// state before the categories were lifted into the sidebar.

import { create } from "zustand";
import type { PaneId } from "../components/settings/settings-nav";

interface SettingsNavState {
	/** The selected leaf settings pane (drives the page's item list + detail). */
	activePane: PaneId;
	/** Select a pane (called by the sidebar category list and the page item list). */
	setActivePane: (pane: PaneId) => void;
}

export const useSettingsNav = create<SettingsNavState>((set) => ({
	// Default to the AI-model pane (inside the 通用 category) — the same landing
	// pane the page used before the categories moved to the sidebar.
	activePane: "ai-model",
	setActivePane: (activePane) => set({ activePane }),
}));
