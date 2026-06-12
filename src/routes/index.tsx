import { createFileRoute } from "@tanstack/react-router";
import App from "@/App";

// Home page: mounts the NanoBee app shell (chat / today views).
// Rendered client-only (ssr: false) — the app is interactive state driven
// (zustand + window listeners) and has no SEO-relevant static content.
export const Route = createFileRoute("/")({
	ssr: false,
	component: App,
});
