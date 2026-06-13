import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/components/chat/ChatView";

// Home page (/): the main two-column chat surface with its centered composer.
export const Route = createFileRoute("/_app/")({
	component: ChatView,
});
