// Two-way bridge between the compare URL search params and the compare store,
// so the selected models + sync-scroll toggle survive refresh and are
// shareable/bookmarkable, and an initial `?q=` (handed in from the chat page)
// auto-runs once.
//
//   ?models=openrouter:google/gemini-3.5-flash,anthropic:claude-haiku-4-5
//   ?sync=1
//   ?q=<initial prompt>
//
// Both directions act only on a real difference so they converge, mirroring the
// research URL sync pattern.

import { useEffect, useRef } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import type { AiProviderId } from "../../lib/ai-providers";
import { useCompareStore, isProviderId } from "../../store/useCompareStore";
import { modelKey, parseModelKey, type CompareModelOption } from "../../lib/compare-models";

// Compare is a second-level view inside the chat page ("/"), not its own route,
// so its bookmarkable state lives in the chat route's search params.
const routeApi = getRouteApi("/_app/");

export function useCompareUrlSync(): void {
	const navigate = useNavigate();
	const search = routeApi.useSearch();
	const columns = useCompareStore((s) => s.columns);
	const lastPrompt = useCompareStore((s) => s.lastPrompt);
	const setColumns = useCompareStore((s) => s.setColumns);
	const run = useCompareStore((s) => s.run);

	// URL → store: load the model set from the URL.
	useEffect(() => {
		const models: CompareModelOption[] = (search.models ?? "")
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean)
			.map((t) => parseModelKey(t, isProviderId))
			.filter((m): m is { provider: AiProviderId; model: string } => m !== null)
			.map((m) => ({ provider: m.provider, model: m.model, label: m.model }));
		if (models.length >= 2) setColumns(models);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search.models]);

	// Initial prompt from the chat entry: run it once.
	const ranQ = useRef<string | null>(null);
	useEffect(() => {
		const q = (search.q ?? "").trim();
		if (q && ranQ.current !== q && lastPrompt !== q) {
			ranQ.current = q;
			run(q);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [search.q]);

	// store → URL: reflect the model set back (keep `compare`/`q` for sharing).
	useEffect(() => {
		const models = columns.map((c) => modelKey(c.provider, c.model)).join(",");
		if (models !== (search.models ?? "")) {
			void navigate({
				to: "/",
				search: (prev) => ({ ...prev, models }),
				replace: true,
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [columns]);
}
