// Shared navigation model for the /settings surface.
// The settings categories (通用 / 研究画布 / 任务 / 聊天) used to be the leftmost
// column of AiSettingsForm; they now live in the left app sidebar
// (SettingsNavList) while the items + detail panes stay on the page. This module
// is the single source of truth both sides import, so the category list, the
// pane→category derivation and the tinted icon tile stay in sync.

import { Icons } from "../../icons/icons";

/** A leaf settings pane (the detail shown in the page's right column). */
export type PaneId =
	| "general"
	| "ai-model"
	| "websearch"
	| "notifications"
	| "shortcuts"
	| "account"
	| "research-style"
	| "tasks-soon"
	| "chat-soon";

export type CategoryId = "general" | "research" | "tasks" | "chat";

export interface NavItem {
	id: PaneId;
	label: string;
	icon: keyof typeof Icons;
	tint: { bg: string; color: string };
}

export interface NavCategory {
	id: CategoryId;
	label: string;
	icon: keyof typeof Icons;
	tint: { bg: string; color: string };
	items: NavItem[];
}

export const TINT_BRAND = { bg: "rgba(99,91,255,0.10)", color: "var(--brand-2)" };
export const TINT_SKY = { bg: "rgba(14,165,233,0.12)", color: "#0ea5e9" };
export const TINT_GREEN = { bg: "rgba(26,127,85,0.10)", color: "var(--success)" };
export const TINT_GREY = { bg: "var(--surface-3)", color: "var(--ink-3)" };

/** Build the category → item tree. The Account item only appears when signed in. */
export function buildCategories(signedIn: boolean): NavCategory[] {
	const generalItems: NavItem[] = [
		{ id: "general", label: "通用", icon: "gear", tint: TINT_GREY },
		{ id: "ai-model", label: "AI 模型", icon: "spark", tint: TINT_BRAND },
		{ id: "websearch", label: "联网搜索", icon: "globe", tint: TINT_SKY },
		{ id: "notifications", label: "通知", icon: "bell", tint: TINT_BRAND },
		{ id: "shortcuts", label: "快捷键", icon: "bolt", tint: TINT_GREEN },
	];
	if (signedIn) {
		generalItems.push({ id: "account", label: "账户", icon: "at", tint: TINT_SKY });
	}
	return [
		{ id: "general", label: "通用", icon: "gear", tint: TINT_GREY, items: generalItems },
		{
			id: "research",
			label: "研究画布",
			icon: "book",
			tint: TINT_BRAND,
			items: [{ id: "research-style", label: "回复风格", icon: "star", tint: TINT_BRAND }],
		},
		{
			id: "tasks",
			label: "任务",
			icon: "list",
			tint: TINT_GREEN,
			items: [{ id: "tasks-soon", label: "通用", icon: "gear", tint: TINT_GREY }],
		},
		{
			id: "chat",
			label: "聊天",
			icon: "chat",
			tint: TINT_SKY,
			items: [{ id: "chat-soon", label: "通用", icon: "gear", tint: TINT_GREY }],
		},
	];
}

/**
 * Resolve which category a pane belongs to. The sidebar (which renders only the
 * categories, not the items) uses this to highlight the active category without
 * needing the signed-in flag — the Account pane lives in `general`, which is the
 * fallback anyway, so the result is stable regardless of auth state.
 */
export function categoryIdForPane(pane: PaneId): CategoryId {
	for (const cat of buildCategories(true)) {
		if (cat.items.some((i) => i.id === pane)) return cat.id;
	}
	return "general";
}

/** Small tinted logo tile used by the category / item rows. */
export function NavIcon({ icon, tint }: { icon: keyof typeof Icons; tint: { bg: string; color: string } }) {
	const Icon = Icons[icon];
	return (
		<span className="nb-ai-prow-logo" style={{ background: tint.bg, color: tint.color }} aria-hidden="true">
			<Icon size={15} />
		</span>
	);
}
