// Compare page state: the set of columns (each a provider+model), the shared
// prompt, the provider catalog + which providers the user has keys for, and the
// concurrent per-column SSE streaming. Kept in its own store (like the research
// store) so the main app store stays focused.
//
// Streaming: run() fires one `/api/compare/stream` request per column at once;
// each column grows independently (a slow/failing model never blocks the rest).
// Token updates are coalesced to one render per frame per column.

import { create } from "zustand";
import type { AiProviderId } from "../lib/ai-providers";
import { AI_PROVIDER_IDS } from "../lib/ai-providers";
import {
	COMMON_MODELS,
	DEFAULT_COMPARE_MODELS,
	MAX_COMPARE_COLUMNS,
	MIN_COMPARE_COLUMNS,
	modelKey,
	type CompareModelOption,
} from "../lib/compare-models";
import { apiClient } from "../lib/api-client";
import { nextId } from "../data/ids";

export type ColumnStatus = "idle" | "pending" | "streaming" | "done" | "error";

export interface CompareColumn {
	id: string;
	provider: AiProviderId;
	model: string;
	status: ColumnStatus;
	/** Accumulated markdown answer for the current run. */
	content: string;
	/** Error code + message when status is "error" (null otherwise). */
	error: { code: string; message: string } | null;
	/** Wall-clock ms for the finished run (null until done). */
	durationMs: number | null;
}

export interface ProviderKeyStatus {
	provider: AiProviderId;
	baseUrl: string;
	hasApiKey: boolean;
}

export interface CompareProviderInfo {
	id: AiProviderId;
	label: string;
	keyOptional: boolean;
	hint: string;
	defaultModel: string;
}

interface CompareState {
	columns: CompareColumn[];
	lastPrompt: string;
	/** Shared column width in px (user-draggable, persisted to localStorage). */
	columnWidth: number;
	/** When true, all columns scroll together (URL-synced via ?sync=1). */
	syncScroll: boolean;
	// provider catalog + this user's configured providers (from GET /providers)
	providers: CompareProviderInfo[];
	configured: ProviderKeyStatus[];
	signedIn: boolean;
	providersLoaded: boolean;

	loadProviders: () => Promise<void>;
	/** Replace the column set from a model list (URL → store); no-op if identical. */
	setColumns: (models: CompareModelOption[]) => void;
	addColumn: () => void;
	removeColumn: (id: string) => void;
	setColumnModel: (id: string, provider: AiProviderId, model: string) => void;
	/** Live-update the shared column width while dragging the resize handle. */
	setColumnWidth: (w: number) => void;
	/** Persist the current column width to localStorage (called on drag end). */
	saveColumnWidth: () => void;
	/** Toggle the sync-scroll flag (reflected in the URL as ?sync=1). */
	setSyncScroll: (on: boolean) => void;
	/** Send the prompt to every column concurrently. */
	run: (prompt: string) => void;
	/** Re-run every column with the last prompt. */
	regenerateAll: () => void;
	/** Re-run one column with the last prompt. */
	retryColumn: (id: string) => void;
	/** Whether a given (provider, model) can run now (has a key / OpenRouter). */
	canRun: (provider: AiProviderId) => boolean;
	saveProviderKey: (provider: AiProviderId, apiKey: string, baseUrl: string) => Promise<boolean>;
	deleteProviderKey: (provider: AiProviderId) => Promise<void>;
}

function isProviderId(id: string): id is AiProviderId {
	return (AI_PROVIDER_IDS as readonly string[]).includes(id);
}

// Shared, user-draggable column width (px), persisted to localStorage so the
// chosen width survives reloads. Applied uniformly to every column.
const COL_WIDTH_KEY = "nb-compare-col-width";
const DEFAULT_COL_WIDTH = 480;
const MIN_COL_WIDTH = 300;
const MAX_COL_WIDTH = 920;

function clampWidth(w: number): number {
	return Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, Math.round(w)));
}
function readColWidth(): number {
	if (typeof window === "undefined") return DEFAULT_COL_WIDTH;
	try {
		const v = Number(localStorage.getItem(COL_WIDTH_KEY));
		return v >= MIN_COL_WIDTH && v <= MAX_COL_WIDTH ? v : DEFAULT_COL_WIDTH;
	} catch {
		return DEFAULT_COL_WIDTH;
	}
}
function writeColWidth(w: number): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(COL_WIDTH_KEY, String(w));
	} catch {
		/* localStorage unavailable (private mode / quota) — width just won't persist */
	}
}

/** A fresh column for a (provider, model). */
function makeColumn(opt: CompareModelOption): CompareColumn {
	return {
		id: nextId("col"),
		provider: opt.provider,
		model: opt.model,
		status: "idle",
		content: "",
		error: null,
		durationMs: null,
	};
}

// Per-column abort controllers (kept out of render state). A re-run or model
// change aborts any in-flight stream for that column first.
const controllers = new Map<string, AbortController>();
// Per-column token buffers + a queued rAF flush, to coalesce renders.
const buffers = new Map<string, string>();
const rafQueued = new Set<string>();

type SetFn = (fn: (s: CompareState) => Partial<CompareState>) => void;
type GetFn = () => CompareState;

/** Patch one column immutably. */
function patchColumn(set: SetFn, id: string, fn: (c: CompareColumn) => CompareColumn): void {
	set((s) => ({ columns: s.columns.map((c) => (c.id === id ? fn(c) : c)) }));
}

/** Flush the buffered tokens for one column into its content (one render). */
function flushColumn(set: SetFn, id: string): void {
	rafQueued.delete(id);
	const buf = buffers.get(id);
	if (buf === undefined) return;
	patchColumn(set, id, (c) => (c.status === "streaming" ? { ...c, content: buf } : c));
}

function scheduleFlush(set: SetFn, id: string): void {
	if (typeof requestAnimationFrame !== "function") {
		flushColumn(set, id);
		return;
	}
	if (!rafQueued.has(id)) {
		rafQueued.add(id);
		requestAnimationFrame(() => flushColumn(set, id));
	}
}

/** Open one column's SSE stream and drive its state machine to a terminal state. */
async function streamColumn(set: SetFn, get: GetFn, id: string): Promise<void> {
	const col = get().columns.find((c) => c.id === id);
	const prompt = get().lastPrompt;
	if (!col || !prompt) return;

	// Abort any previous run for this column, then start clean.
	controllers.get(id)?.abort();
	const controller = new AbortController();
	controllers.set(id, controller);
	buffers.set(id, "");

	patchColumn(set, id, (c) => ({ ...c, status: "pending", content: "", error: null, durationMs: null }));

	try {
		const res = await fetch("/api/compare/stream", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "same-origin",
			signal: controller.signal,
			body: JSON.stringify({
				provider: col.provider,
				model: col.model,
				messages: [{ role: "user", content: prompt }],
			}),
		});
		if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";
		let streamErr: { code: string; message: string } | null = null;
		let doneMs: number | null = null;
		let started = false;

		const handleFrame = (frame: string) => {
			let event = "message";
			const dataParts: string[] = [];
			for (const line of frame.split("\n")) {
				if (line.startsWith("event:")) event = line.slice(6).trim();
				else if (line.startsWith("data:")) dataParts.push(line.slice(5).trim());
			}
			const data = dataParts.join("");
			if (!data) return;
			if (event === "token") {
				let delta: string;
				try {
					delta = JSON.parse(data) as string;
				} catch {
					return;
				}
				if (!started) {
					started = true;
					patchColumn(set, id, (c) => ({ ...c, status: "streaming" }));
				}
				buffers.set(id, (buffers.get(id) ?? "") + delta);
				scheduleFlush(set, id);
			} else if (event === "done") {
				try {
					doneMs = (JSON.parse(data) as { durationMs: number }).durationMs;
				} catch {
					doneMs = null;
				}
			} else if (event === "error") {
				try {
					const p = JSON.parse(data) as { code?: string; message?: string };
					streamErr = { code: p.code ?? "error", message: p.message ?? "请求失败" };
				} catch {
					streamErr = { code: "error", message: "请求失败" };
				}
			}
		};

		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			let sep: number;
			while ((sep = buffer.indexOf("\n\n")) >= 0) {
				const frame = buffer.slice(0, sep);
				buffer = buffer.slice(sep + 2);
				if (frame.trim()) handleFrame(frame);
			}
		}
		if (buffer.trim()) handleFrame(buffer);
		flushColumn(set, id);

		if (streamErr) {
			const err = streamErr;
			patchColumn(set, id, (c) => ({ ...c, status: "error", error: err }));
			return;
		}
		const finalText = buffers.get(id) ?? "";
		patchColumn(set, id, (c) => ({
			...c,
			status: finalText ? "done" : "error",
			content: finalText,
			error: finalText ? null : { code: "empty", message: "模型没有返回内容" },
			durationMs: doneMs,
		}));
	} catch (error) {
		if (controller.signal.aborted) return; // superseded by a newer run
		console.error("[compare] stream failed:", String(error));
		patchColumn(set, id, (c) => ({
			...c,
			status: "error",
			error: { code: "network", message: "网络错误，点重试再试一次" },
		}));
	} finally {
		if (controllers.get(id) === controller) controllers.delete(id);
	}
}

export const useCompareStore = create<CompareState>((set, get) => ({
	columns: DEFAULT_COMPARE_MODELS.map(makeColumn),
	lastPrompt: "",
	columnWidth: readColWidth(),
	syncScroll: false,
	providers: [],
	configured: [],
	signedIn: false,
	providersLoaded: false,

	loadProviders: async () => {
		try {
			const res = await apiClient.compare.providers.$get();
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as {
				signedIn: boolean;
				providers: CompareProviderInfo[];
				configured: ProviderKeyStatus[];
			};
			set({
				providers: data.providers,
				configured: data.configured,
				signedIn: data.signedIn,
				providersLoaded: true,
			});
		} catch (error) {
			console.error("[compare] loadProviders failed:", String(error));
			set({ providersLoaded: true });
		}
	},

	setColumns: (models) => {
		if (models.length < MIN_COMPARE_COLUMNS) return;
		const cur = get().columns;
		const same =
			cur.length === models.length &&
			cur.every((c, i) => c.provider === models[i].provider && c.model === models[i].model);
		if (same) return;
		set({ columns: models.slice(0, MAX_COMPARE_COLUMNS).map(makeColumn) });
	},

	addColumn: () => {
		const cols = get().columns;
		if (cols.length >= MAX_COMPARE_COLUMNS) return;
		const used = new Set(cols.map((c) => modelKey(c.provider, c.model)));
		const pick =
			COMMON_MODELS.find((m) => !used.has(modelKey(m.provider, m.model))) ?? COMMON_MODELS[0];
		set({ columns: [...cols, makeColumn(pick)] });
	},

	removeColumn: (id) => {
		const cols = get().columns;
		if (cols.length <= MIN_COMPARE_COLUMNS) return;
		controllers.get(id)?.abort();
		controllers.delete(id);
		set({ columns: cols.filter((c) => c.id !== id) });
	},

	setColumnModel: (id, provider, model) => {
		controllers.get(id)?.abort();
		patchColumn(set, id, (c) => ({
			...c,
			provider,
			model,
			status: "idle",
			content: "",
			error: null,
			durationMs: null,
		}));
	},

	setColumnWidth: (w) => set({ columnWidth: clampWidth(w) }),
	saveColumnWidth: () => writeColWidth(get().columnWidth),
	setSyncScroll: (on) => set({ syncScroll: on }),

	run: (prompt) => {
		const text = prompt.trim();
		if (!text) return;
		set({ lastPrompt: text });
		for (const c of get().columns) void streamColumn(set, get, c.id);
	},

	regenerateAll: () => {
		if (!get().lastPrompt) return;
		for (const c of get().columns) void streamColumn(set, get, c.id);
	},

	retryColumn: (id) => {
		if (!get().lastPrompt) return;
		void streamColumn(set, get, id);
	},

	canRun: (provider) => {
		if (provider === "openrouter") return true; // built-in key
		return get().configured.some((e) => e.provider === provider && e.hasApiKey);
	},

	saveProviderKey: async (provider, apiKey, baseUrl) => {
		try {
			const res = await apiClient.compare.keys.$put({
				json: { provider, apiKey, baseUrl: baseUrl || "" },
			});
			if (!res.ok) return false;
			const data = (await res.json()) as { configured: ProviderKeyStatus[] };
			set({ configured: data.configured });
			return true;
		} catch (error) {
			console.error("[compare] saveProviderKey failed:", String(error));
			return false;
		}
	},

	deleteProviderKey: async (provider) => {
		try {
			const res = await apiClient.compare.keys[":provider"].$delete({ param: { provider } });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as { configured: ProviderKeyStatus[] };
			set({ configured: data.configured });
		} catch (error) {
			console.error("[compare] deleteProviderKey failed:", String(error));
		}
	},
}));

export { isProviderId };
